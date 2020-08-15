const AppError = require('../utils/appError');

const handleCasteError = (err) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateErrorDB = (err) => {
  const value = err.keyValue.name; //.match(/(["'])(\\?.)*?\1/) for different error formats
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};
const handleJWTError = (err) => {
  return new AppError('Invalid Token! Please Try Again', 401);
};
const handleJWTExpiredError = (err) => {
  return new AppError('The token has already expired!', 401);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.properties.message);
  const message = `Invalid input data! ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // ERROR FOR THE API
    // req.originalUrl gives the url without the server address - '127.0....' bullshit
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // ERROR FOR RENDERED WEBSITE
    console.error('Error:', err);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};
const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    // ERROR FOR THE API
    // req.originalUrl gives the url without the server address - '127.0....' bullshit

    // Returning operational errors
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // For errors that are not operational and are made by programmers
    // Log Errors
    console.error('Error:', err);
    // Send Generic Response
    res.status(err.statusCode).json({
      status: 'error',
      message: 'something went wrong!',
    });
  }
  // ERROR FOR RENDERED WEBSITE
  // Returning operational errors
  if (err.isOperational) {
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // For errors that are not operational and are made by programmers
  else {
    // Log Errors
    console.error('Error:', err);
    // Send Generic Response
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: 'Try Again!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  }
  if (process.env.NODE_ENV === 'production') {
    //console.log(process.env.NODE_ENV);
    let error = { ...err };
    error.message = err.message;
    //console.log(err.name);
    if (err.name === 'CastError') {
      error = handleCasteError(error);
    }
    if (err.code === 11000) {
      error = handleDuplicateErrorDB(error); //11000 is the error code for dulicate error
    }
    if (err.name === 'ValidationError') {
      error = handleValidationErrorDB(error);
    }
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError(error);
    }
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError(error);
    }
    sendErrorProd(error, req, res);
  }
};
