const express = require('express');
const router = express.Router();
const { ROLES} = require('../constants/index')
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth')
const {authorizeRole} = require('../middleware/authorizeRole')
const {checkUserId}= require('../middleware/checkUserId')




// POST request to create a new user
router.post('/', auth, authorizeRole(ROLES.Admin), userController.createUser);

// // GET request to get user's info
// router.get('/',auth, userController.createUser);

// GET request to get user by userId
router.get('/:userId', auth , userController.getUserById);

// PUT request to update user by userId
router.patch('/:userId', auth, authorizeRole(ROLES.User), userController.updateUser);

// DELETE request to delete user by userId
router.delete('/:userId', auth, authorizeRole(ROLES.User), userController.deleteUser);





// POST request to follow a user
router.post('/:userId/follow',auth, authorizeRole(ROLES.User), userController.followUser);

// POST request to unfollow a user
router.post('/:userId/unfollow', auth, authorizeRole(ROLES.User), userController.unfollowUser);

// POST request to place an order
// router.post('/order', userController.placeOrder);

// POST request to rate a user
router.post('/rate', userController.rateUser);

// POST request to switch account type
router.post('/switch-account', userController.switchAccountType);

module.exports = router;
