const jwt = require('jsonwebtoken');

exports.createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.cookieOptions = () => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // so that no one can manipulate the browser saved cookie
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  return cookieOptions;
};
