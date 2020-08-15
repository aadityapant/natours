const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const CatchAsync = require('../utils/catchAsync');
const appError = require('../utils/appError');
const tokenCreator = require('../utils/tokenCreator');
const Email = require('../utils/email');

exports.signup = CatchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const token = tokenCreator.createToken(newUser._id);
  const cookieOptions = tokenCreator.cookieOptions();
  res.cookie('jwt', token, cookieOptions);
  newUser.password = undefined;

  //Send Welcome email
  const url = `${req.protocol}://${req.get('get')}/me`;
  await new Email(newUser, url).sendWelcome();

  res.status(201).json({
    status: 'success',
    token,
    user: newUser,
  });
});

exports.signin = CatchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //check if email and password exist
  if (!email || !password) {
    return next(new appError('Please provide an email and password!', 400));
  }
  //check if the user exists and the password is correct
  const userOne = await User.findOne({ email }).select('+password'); // '+password' because we have done select:false in the models
  //const correct = await userOne.correctPassword(password, userOne.password);
  //the 'correct' variable command should be executed only if userOne is defined i.e if the username is correct. So to solve this we have included the command in the if statement
  if (
    !userOne ||
    !(await userOne.correctPassword(password, userOne.password))
  ) {
    return next(new appError('Incorrect email or password!', 401));
  }
  //if everything is okay then send the token ti the client
  //console.log(userOne._id);
  const token = tokenCreator.createToken(userOne._id);
  const cookieOptions = tokenCreator.cookieOptions();
  res.cookie('jwt', token, cookieOptions);
  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.signOut = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = CatchAsync(async (req, res, next) => {
  let token;
  //getting the token and checking if its there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  //console.log(token);
  if (!token) {
    next(
      new appError('You are not logged in. Please login to get access', 401)
    );
  }
  //verification token
  //LECTURE 131 @ 00:00
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //check if uer still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(
      new appError('The User belonging to this Token doesnt exist!', 401)
    );
  }
  //check if the password has been changed
  if (freshUser.changedPassword(decoded.iat)) {
    return next(
      new appError('You have recently changed the password. Login again!', 401)
    );
  }
  //GRANT ACCESS TO THE PROTECTED ROUTE
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  // TO EDIT THE HEADER IF THE USER IS LOGGED IN
  //similar to the protect middleware
  try {
    if (req.cookies.jwt) {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPassword(decoded.iat)) {
        return next(
          new appError(
            'User has recently changed their password! Please Login Again',
            401
          )
        );
      }
      //If the compiler gets till here, then this means that the user is correctly logged in.

      //We have to make that user accessible to the templates
      //Below get the pug templates access to the user
      res.locals.user = currentUser;
    }
    return next();
  } catch (err) {
    return next();
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new appError(
          'You do not have the permission to perform this action',
          403
        )
      );
    }
    next();
  };
};

exports.forgotPassword = CatchAsync(async (req, res, next) => {
  // 1) Get User based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new appError('There is no user with this email address.', 404));
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3) Send it to the user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Click on the link to reseet the passowrd: ${resetURL}. Ignore this if this wasnt you!`;
  //We are not using catchAsync because we want to also delete the token not just simply send an error
  try {
    //For building the API
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reser link(Valid only for 10 mins)',
    //   message,
    // });

    new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message,
    });
  } catch (err) {
    await user.deleteToken();
    //console.log(err);
    next(
      new appError('There was an error sending the email! Try again later!')
    );
  }
});

exports.resetPassword = CatchAsync(async (req, res, next) => {
  //Get the user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //If the token has not expired, and there is user, set the new password
  if (!user) {
    return next(new appError('Token is invalid or the token has expired!'));
  }
  await user.resetPassword(req.body.password, req.body.passwordConfirm);
  //Update the changedPasswordAt property for the user
  //Log the user in, send JWT
  const token = tokenCreator.createToken(user._id);
  const cookieOptions = tokenCreator.cookieOptions();
  res.cookie('jwt', token, cookieOptions);
  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.updatePassword = CatchAsync(async (req, res, next) => {
  //Get the user from collection
  console.log(req.body);
  const user = await User.findById(req.user.id).select('+password');
  //Check if the posted current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new appError('This password is incorrect. Try Again!'), 401);
  }
  //If so, update password
  await user.updatePassword(req.body.password, req.body.passwordConfirm);
  //Log user in, send JWT
  const token = tokenCreator.createToken(user._id);
  const cookieOptions = tokenCreator.cookieOptions();
  res.cookie('jwt', token, cookieOptions);
  res.status(201).json({
    status: 'success',
    token,
    message: `Password for user: ${user.email} has been updated`,
  });
});
