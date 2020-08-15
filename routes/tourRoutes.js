const express = require('express');
const tourController = require('../controller/toursController');
const authController = require('../controller/authController');
const reviewRouter = require('./reviewRoutes');
// const reviewController = require('../controller/reviewController');

//-----------------------------------ROUTES------------------------------

const router = express.Router(); //this is a middleware

//router.param('id', tourController.checkID);

//--------NESTED ROUTES-------------
// POST /tours/:tourId/reviews
// GET /tours/:tourId/reviews
// GET /tours/:tourId/createReview
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );
router.use('/:tourId/reviews', reviewRouter);

//---------GEOSPATIAL QUERIES----------
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getTourWithin);
// '/tour-within?distance=233&center=-40,45&unit=mi'
// the above could also be used to get the params but we are using a more cleaner way

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

//ALIASING
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);
router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  ); //chaining multiple handlers/middlewares in another middleware!!!!!!!!

module.exports = router;
