const mongoose = require('mongoose');

//Setting Up Environment Variables
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception! Shutting Down......');
  console.log(err.name, err.message);
  console.log(err);
  process.exit(1);
});

const app = require('./apps');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
//Connecting to the database
mongoose
  .connect(DB, {
    //instead of DB use process.env.DATABASE_LOCAL
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    //console.log(con.connections);
    console.log('DB connection successful');
  });

// console.log(process.env);
console.log(process.env.NODE_ENV);

const port = process.env.PORT || 8000;

const server = app.listen(port, () => {
  console.log(`The app is running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! SHUTTING DOWN.....');
  server.close(() => {
    process.exit(1);
  });
});
