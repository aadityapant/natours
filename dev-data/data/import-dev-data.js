const mongoose = require('mongoose');

const dotenv = require('dotenv');
const fs = require('fs');
const Tour = require('../../models/tourModel');
const Review = require('../../models/reviewModel');
const User = require('../../models/userModel');

//CONFIG .ENV INTO THE FILE
dotenv.config({ path: './config.env' });

//CONNECT TO THE DATABASE
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
  })
  .then(() => {
    console.log('DB is connected');
  });

//READ THE FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
//IMPORT THE DATA INTO THE DATABASE
const importData = async () => {
  try {
    await Tour.create(tours);
    await Review.create(reviews);
    await User.create(users, { validateBeforeSave: false });
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

//DELETE ALL DATA FROM THE COLLECTION
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await Review.deleteMany();
    await User.deleteMany();
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

console.log(process.argv); //--import and --delete are the third argument in process.argv in the console

//CLI FOR IMPORT AND DELETE
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] == '--delete') {
  deleteData();
}
