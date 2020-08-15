const multer = require('multer');
const sharp = require('sharp');

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const appError = require('../utils/appError');
const factory = require('./handlerFactory');

//---------------------------Storage Properties
//Use this if no image processing is needed
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });
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

//---------------------------fUNCTIONS-------------------------------------------
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//----------------------------ROUTE HANDLERS-------------------------------------

exports.updateUserPhoto = upload.single('photo');
exports.faltu = (req, res, next) => {
  console.log(req.body);
  return next();
};
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.getAllUsers = catchAsync(async (req, res) => {
  const allUsers = await User.find();
  res.status(500).json({
    status: 'success',
    allUsers,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please Use /signup instead',
  });
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user;
  next();
};

exports.getUsers = factory.getOne(User);

//NOT FOR UPDATING PASSWORDS
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);

exports.updateMe = catchAsync(async (req, res, next) => {
  //Check if the password is not being updated
  console.log(req.body);
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new appError(
        'This route is not for updating the passowrd! Use the route : /updateMyPassword'
      )
    );
  }
  //filter unwanted usernale that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'email', 'name');
  if (req.file) filteredBody.photo = req.file.filename;
  //Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
