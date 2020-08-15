const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const appError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
  //get tour data from collection
  const tours = await Tour.find();

  //build template

  //render that template using tour data from the first step
  res.status(200).render('overview', {
    title: 'ALL tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.tourSlug }).populate({
    path: 'reviewCount',
    fields: 'review rating user',
  });
  //console.log(tour.reviewCount);

  if (!tour) return next(new appError('The Tour is not found!!!', 404));
  // Build templates
  //Render templates using data from the first step
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account!',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  //find all the bookings
  const bookings = await Booking.find({ user: req.user });

  //find tours that match the ID of the bookings
  const tourIds = bookings.map((el) => el.tour.id);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
