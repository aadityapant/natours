const express = require('express');
const reviewController = require('../controller/reviewController');
const authController = require('../controller/authController');

//--------NESTED ROUTES-------------
// POST /tours/:tourId/reviews
// GET /tours/:tourId/reviews
//for providing the ':tourId' params in this route
const router = express.Router({ mergeParams: true });

//-------------------------------ALL ROUTES----------------------------
router.use(authController.protect);
router
  .route('/')
  .post(
    /*authController.protect,*/
    authController.restrictTo('user', 'admin'),
    reviewController.createReview
  )
  .get(/*authController.protect,*/ reviewController.getAllReviews);

router
  .route('/:id')
  .get(/*authController.protect,*/ reviewController.getReview)
  .delete(
    /*authController.protect,*/ authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    /*authController.protect,*/ authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  );
module.exports = router;
