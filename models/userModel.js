const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

//name, email, photo, password, passwordconfirm;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name'],
  },
  email: {
    type: String,
    required: [true, 'A user must have a valid email'],
    validate: [validator.isEmail],
    unique: [true, 'This email is already registered'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Enter a valid password'],
    minlength: 8,
    maxlength: 255,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please write the password again'],
    validate: {
      //this only work on CREATE AND SAVE!!!
      validator: function (el) {
        //we only return true or false from the validator function
        return el === this.password;
      },
      message: 'The passwords are not the same!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//Document Middleware to encrypt the passwords
userSchema.pre('save', async function (next) {
  // only run the if statement if password is modified
  if (!this.isModified('password')) return next();
  // Hash the password with the cost of 12
  const pass = await bcrypt.hash(this.password, bcrypt.genSaltSync(12));
  this.password = pass;
  // Delete the password confirm field
  // console.log(await bcrypt.compare(this.passwordConfirm, this.password));
  // console.log(await bcrypt.compare(this.passwordConfirm, pass));
  // console.log(pass);
  // console.log(this.password);
  this.passwordConfirm = undefined;
  return next();
});

// userSchema.pre('save', function (next) {
//   if (this.isModified('password') || this.isNew) return next();

//   this.passwordChangedAt = Date.now() - 1000; // minus 1000 is doen because sometimes the token is created before the password is saved
//   return next();
// });

//Query 'pre' Middleware so that inactive users dont really show
userSchema.pre(/^find/, function (next) {
  //this points to the current query starting with find - '/^find/' is a regex
  this.find({ active: { $ne: false } });
  return next();
});

//Instance method(check online) to check for correct passwords
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  // console.log(bcrypt.compareSync(candidatePassword, userPassword));
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPassword = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changedTimeStamp, JWTTimeStamp);
    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  //console.log({ resetToken }, this.passwordResetToken);
  return resetToken;
};

userSchema.methods.deleteToken = async function () {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetPassword = async function (pass, confpass) {
  this.password = pass;
  this.passwordConfirm = confpass;
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
  await this.save();
};

userSchema.methods.updatePassword = async function (pass, confpass) {
  this.password = pass;
  this.passwordConfirm = confpass;
  await this.save();
};

const User = mongoose.model('User', userSchema);
module.exports = User;
