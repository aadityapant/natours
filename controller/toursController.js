const multer = require('multer');
const sharp = require('sharp');

const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const appError = require('../utils/appError');
const factory = require('./handlerFactory');
const { json } = require('express');

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );
//EXAMPLE OF MIDDLEWARE:(PARAM)
// exports.checkID = (req, res, next, val) => {
//   // console.log(`Tour id is: ${val}`);
//   // if (req.params.id > tours.length) {
//   //   return res.status(404).json({
//   //     status: 'fail',
//   //     message: 'invalid ID',
//   //   });
//   // }
//   next();
// };
// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price',
//     });
//   }
//   next();
// };

const multerStorage = multer.memoryStorage(); // This will store the image as a buffer not as a file in HDD

//---------------------------Multer Filter--------------------------------
// Check if it is an image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new appError('Not an image! Please upload the image only!'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
//---------------------------------ROUTE HANDLERS----------------------------------------------------

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
  //stores in req.files
]);
//upload.single(''image); -> req.file
//upload.array('images',5); -> req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2)Images
  req.body.images = [];
  // We did promiseAll because we need req.body.images updated before going to the other middleware. If the inner function is the only one that is async, then the code will execute and the array will not be updated(forEach). Hence we use 'map' so that an array of promises is return that we will await.
  // read forEach vs map
  await Promise.all(
    req.files.images.map(async (img, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      req.body.images.push(filename);
      await sharp(img.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
    })
  );
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.page = 1;
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getTourStats = catchAsync(async (req, res) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // null replace any field we want the aggregation function to work for, just replace with '$name_of_field'
        numTours: { $sum: 1 }, // add one for each document
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $min: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } }, // FOR ID NOT EQUAL TO EASY
    // },
  ]);
  res.status(200).json({
    status: 'success',
    timeOfRequest: req.requestTime,
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);
  res.status(200).json({
    status: 'success',
    number: plan.length,
    data: {
      plan,
    },
  });
});

exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res) => {
//   //WAYS OF WRITING QUERIES
//   //NO. 1
//   // const tours = await Tour.find()
//   //   .where('duration')
//   //   .lt(10)
//   //   .where('difficulty')
//   //   .equals('easy');
//   //NO. 2
//   // const queryObj = { ...req.query }; //destructuring using '...' and putting them in a new obj, this creates a new copy of the object

//   // //FILTERING
//   // const excludeFields = ['page', 'sort', 'limit', 'fields'];
//   // excludeFields.forEach((el) => {
//   //   delete queryObj[el];
//   // });

//   // //ADVANCED FILTERING
//   // let queryStr = JSON.stringify(queryObj);
//   // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); //Regex to put $gte instead of normal gte
//   // //console.log(JSON.parse(queryStr));
//   // let query = Tour.find(JSON.parse(queryStr));

//   // //SORTING
//   // if (req.query.sort) {
//   //   const sortBy = req.query.sort.split(',').join(' ');
//   //   query = query.sort(sortBy);
//   //   //To provide second criterea if the first one lets say price is equal for some objects
//   //   //query.sort('price ratingsAverage') so the second field with a space
//   // } else {
//   //   query = query.sort('-createdAt');
//   // }
//   // //FIELD LIMITING
//   // if (req.query.fields) {
//   //   const fields = req.query.fields.split(',').join(' ');
//   //   query = query.select(fields);
//   // } else {
//   //   query = query.select('-__v');
//   // }
//   // //PAGINATION
//   // const page = req.query.page * 1 || 1; //The page number required as a response
//   // const limit = req.query.limit * 1; // The number of entries allowed in a page
//   // const skip = (page - 1) * limit; // If it is page number 2, the entries of page no 1 must be skipped, this ia what is calculated and stored in this object

//   // if (req.query.page) {
//   //   const numTours = await Tour.countDocuments();
//   //   if (skip >= numTours) throw new Error('This page does not exist');
//   // }

//   // query = query.skip(skip).limit(limit);

//   // //EXECUTE QUERY

//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const tours = await features.query;

//   res.status(200).json({
//     status: 'success',
//     timeOfRequest: req.requestTime,
//     result: tours.length, //Jonas insists we do this
//     data: {
//       tours,
//     },
//   });
// });

exports.getTour = factory.getOne(Tour, { path: 'reviewCount' });
//   catchAsync(async (req, res, next) => {
//   //   console.log(req.params);
//   // const tour = tours.find((el) => el.id === req.params.id * 1); //shows how to use params!!!!
//   const tour = await Tour.findById(req.params.id).populate('reviewCount');
//   if (!tour) {
//     return next(new appError('The Tour Does Not Exist!'));
//   }
//   res.status(200).json({
//     status: 'success',
//     body: {
//       tour,
//     },
//   });
// });

exports.createTour = catchAsync(async (req, res, next) => {
  //   console.log(req.body);
  // const newId = tours[tours.length - 1].id + 1;
  // const someObj = { id: newId };
  // const newTour = Object.assign(someObj, req.body);
  // console.log(newTour);
  // tours.push(newTour);
  // fs.writeFile(
  //   `${__dirname}/dev-data/data/tours-simple.json`,
  //   JSON.stringify(tours),
  //   (err) => {
  //     if (err) {
  //       res.status(404).json({
  //         status: 'false',
  //         message: `The error was ${err}`,
  //       });
  //     }
  //     res.status(201).json({
  //       status: 'success',
  //       body: {
  //         tour: newTour,
  //       },
  //     });
  //   }
  // );

  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { tour: newTour },
  });
});

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new appError('Non Existing Tours Cannot Be Deleted'));
//   }

//   res.status(204).json({
//     status: 'sucess',
//     message: null,
//   });
// });
exports.deleteTour = factory.deleteOne(Tour);

//DO NOT UPDATE PASSWORDS USING THIS
exports.updateTour = factory.updateOne(Tour);

// '/tour-within?distance=233&center=-40,45&unit=mi'
exports.getTourWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.3 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new appError(
        'Please provide latitude and longitude in the format lat,lng'
      )
    );
  }
  const tour = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tour.length,
    data: {
      data: tour,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  if (!lat || !lng) {
    return next(
      new appError(
        'Please provide latitude and longitude in the format lat,lng'
      )
    );
  }
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    result: distances.length,
    data: {
      data: distances,
    },
  });
});
