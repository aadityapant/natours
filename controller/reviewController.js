const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.createReview = catchAsync(async (req, res, next) => {
  //Allow nested routes
  //console.log(req.params.tourId);
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user;
  const newReview = await Review.create({
    review: req.body.review,
    rating: req.body.rating,
    createdAt: req.body.createdAt,
    tour: req.body.tour,
    user: req.body.user,
  });
  res.status(201).json({
    status: 'success',
    message: 'Review posted successfully',
    data: {
      newReview,
    },
  });
});

exports.getAllReviews = factory.getAll(Review);

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const allReviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     data: allReviews,
//   });
// });

exports.getReview = factory.getOne(Review, { path: 'User' });

exports.deleteReview = factory.deleteOne(Review);

exports.updateReview = factory.updateOne(Review);
