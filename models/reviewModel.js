const mongoose = require('mongoose');
const Tour = require('./tourModel');
const { findByIdAndUpdate } = require('./tourModel');

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'review cannot be empty!!!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour!!!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user!!!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: false },
  }
);

//------------------------------------------REVIEW INDEX---------------------------------------

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//----------------------------------------- QUERY MIDDLEWARE--------------------------------------

reviewSchema.pre(/^find/, function (next) {
  this.select('-__v');
  // this.populate({
  //   path: 'tour user',
  //   select: 'name',
  // });
  // this.populate({
  //   path: 'user',
  //   select: 'name',
  // }).populate({
  //   path: 'tour',
  //   select: 'name',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});
//PREVENTING DUPLICATE REVIEWS
//findbyIdAndUpdate
//findByIdAndDelete
//This is not a DCOUMENT MIDDLEWARE. So we dont have access to the document in QUERY MIDDLEWARE.
//Below, is the technique to go around this problem.
//Query Middleware cant be 'post' because the query has been executed and completed at that point.
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //The 'this' keyword here points to the current query
  this.r = await this.findOne(); // this allows us to execute the query and find the document of the current query
  //r is now the property of query middleware which can also be accessed in the 'Post Query Middleware'.
  // we dont call calcAverageRatings here because the Model is not update when 'pre' middlewares are called
  // So, new avg through the pipeline cannot be calculated here, but, only after the new data is saved
  next();
});

reviewSchema.post('save', function () {
  //this points to current review
  // Review.calcAverageRatings(this.tour);
  //CANNOT USE THE ABOVE STATEMENT because 'Review' variable is not yet created and hence it will not point to the model
  //So we use this.constructor instead to point to the model
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
  //refer to the above function to understand this
});
//------------------------------------STATIC METHODS----------------------------------------------------

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // WE ARE USING STATIC BECAUSE WE HAVE TO CALL AGGREGATE ON THE MODEL NOT ITS INSTANCE
  // 'this' keyword here is the Review Model itself.
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
