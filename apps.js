//------------------------------------IMPORTS AND MIDDLEWARES-------------------------------

const path = require('path');
const express = require('express');

const app = express();
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const AppError = require('./utils/appError');
const errorController = require('./controller/errorController');

//DEFINE VIEW ENGINE
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // we didnt use './views' and `${__dirname}/views` becuase some environments dont have '/' in them

//SECURITY HTTP HEADERS
app.use(helmet());
//This is a predefined middleware
app.use(express.json({ limit: '10kb' }));

app.use(express.urlencoded({ extended: true, limit: '10kb' })); // (NOT IMPLEMENTED) but for implementing 'action' in html 'form' to submit data & parse it in the backend

app.use(cookieParser());

//DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize());

//DATA SANITIZATION AGAONST XSS
app.use(xss());

//PREVENT PARAMETER POLLUTION
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

//SERVING STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));
//SETTING UP THE ENVIRONMENT VARIABLES
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
//This is a user defined middleware
// app.use((req, res, next) => {
//   console.log('Hello form the middleware');
//   next();
// });

//LIMIT REQUESTS FROM THE API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Way too many requests, please try again!',
});

//PUTTING THE DATE
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.cookies);
  next();
});
app.use('/api', limiter);

// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ message: 'The app is running properly', app: 'Natours' });
// });
// app.post('/', (req, res) => {
//   res.status(200).send('Post is also working');
// });

//---------------------------------------CALLBACK FOR ROUTES-------------------------------------

// app.get('/api/v1/tours', getAllTours);
// //permanant parameters
// app.get('/api/v1/tours/:id', getTour);
// //POST requests
// app.post('/api/v1/tours', createTour);
// //Applyinng PATCH
// app.patch('/api/v1/tours/:id', updateTour);
// //DELETE request
// app.delete('/api/v1/tours/:id', deleteTour);
//optional parameters by usin '?' after ':x' we make 'x' an optuonal parameter
// app.get('/api/v1/tours/:id/:x?', (req, res) => {
//   console.log(req.params.x);
//   res.status(200).end('Done');
// });

//---------------------------ROUTES---------------------------------------------

app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
// If a request is not answerd till here then all the middlewares have run and correct route has not been found
// So we define an all purpose route to handle requests that were not found in
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'failed',
  //   message: 'this page does not exist',
  // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(errorController);

//Till here the middle ware has run so we export app so that we export our application
// and whatever we have done untill now, the configurations and stuff, is also exported and imported at server.js
//This is done inorder to maintain the Request-Response Cycle
module.exports = app;
