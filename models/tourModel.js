const mongoose = require('mongoose');

const slugify = require('slugify');

// const User = require('./userModel');

//const validator = require('validator'); //external validation library

//------------------------------------DATABASE SCHEMA---------------------------------------------
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less than 40 characters'],
      minlength: [10, 'A tour name must have more than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must contain characters only'], this is validation using validation using external library
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour mmust have a max group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'difficulty is either easy/medium/difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (el) => Math.round(el * 10) / 10, // 4.66667 *10 = 46.66667 rounded is 47 divided by 10 is 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // 'this' points to the current doc on the NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true, //removes whitespace in the begining and the end of the string
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have image cover'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTours: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //geoJSON for geospacial location in MongoDB
      type: {
        type: String,
        defualt: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//-------------------------------CREATING INDEX-------------------------------

//SINGLE FIELD INDEX
// tourSchema.index({ price: 1 });
tourSchema.index({ slug: 1 });
//MULTIPLE FIELD INDEX
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ startLocaton: '2dsphere' });

//-------------------------------VIRTUAL POPULATE------------------------------
//Go to the tour controller and do .populate('reviewCount') for every query you want this virtual field to show in.
//I have done this in only 'getTour' Middleware in the controller function
tourSchema.virtual('reviewCount', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//----------------------------------------DOCUMENT MIDDLEWARE-------------------------------------------
//THESE ARE OF TWO TYPES: 1)PRE AND 2)POST AND THESE MIDDLEWARES ARE EXECUTED BEFORE & AFTER a certain command. in the example below
// the middleware is executed before the 'save'(create/save) operation
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//INSTED OF EMBEDDING WE ARE PERFORMING CHILD REFERENCING - REFER TO NOTES FOR DB ARCHITECTURE
// tourSchema.pre('save', async function (next) {
//   // EMBEDDING GUIDES IN tOURS DB - ONLY WORKS WHILE 'SAVE' NOT UPDATE
//   const guidesPromise = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromise);
//   next();
// });

//-----------------------------------------QUERY MIDDLEWARE-------------------------------------------------
//THIS WILL POINT TO A QUERY! and it works only on the find() command only
// tourSchema.pre('find', function (next) {
//   this.find({ secretTours: { $ne: true } });
//   next();
// });
//THIS REGEX WORKS FOR ALL THE QUERIES THAT START WITH 'find'
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTours: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  //populate creates a separate query to fill the EMBEDED documents with actual database
  //do not use this with large databases since it will take a long time
  // console.log('hello');
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt -password',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} millisecond`);
  //console.log(docs);
  next();
});

//-------------------------------------AGGREGATION MIDDLEWARE-----------------------------------------------
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: false } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
