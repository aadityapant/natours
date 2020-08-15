const express = require('express');

const userController = require('../controller/userController');
const authController = require('../controller/authController');

//-----------------------------ROUTES-------------------------------
const router = express.Router(); //This is a middleware
router.route('/signup').post(authController.signup); //this route is not in the rest format
router.route('/signin').post(authController.signin);
router.route('/signout').get(authController.signOut);
router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);

router.use(authController.protect);

router
  .route('/updatePass')
  .patch(/*authController.protect,*/ authController.updatePassword);
router
  .route('/me')
  .get(
    /*authController.protect,*/ userController.getMe,
    userController.getUsers
  );
router.route('/updateMe').patch(
  /*authController.protect,*/
  //userController.faltu,
  userController.updateUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.route('/deleteMe').delete(
  /*authController.protect,*/
  userController.deleteMe
);

router.use(authController.restrictTo('admin'));

router
  .route('/:id')
  .get(/*authController.restrictTo('admin'),*/ userController.getUsers)
  .patch(/*authController.restrictTo('admin'),*/ userController.updateUser)
  .delete(/*authController.restrictTo('admin'),*/ userController.deleteUser);
router
  .route('/')
  .get(/*authController.restrictTo('admin'),*/ userController.getAllUsers)
  .post(/*authController.restrictTo('admin'),*/ userController.createUser);
module.exports = router;
