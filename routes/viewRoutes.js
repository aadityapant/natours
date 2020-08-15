const express = require('express');

const router = express.Router();

const viewController = require('../controller/viewController');
const authController = require('../controller/authController');
const bookingController = require('../controller/bookingController');

router.route('/me').get(authController.protect, viewController.getAccount);

router.use(authController.isLoggedIn);

router
  .route('/')
  .get(bookingController.createBookingCheckout, viewController.getOverview);
router.route('/tours/:tourSlug').get(viewController.getTour);
router.route('/login').get(viewController.getLoginForm);
router
  .route('/my-tours')
  .get(authController.protect, viewController.getMyTours);

module.exports = router;
