const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// POST request to create a new user
router.post('/', userController.createUser);

// GET request to get user by userId
router.get('/:userId', userController.getUserById);

// PUT request to update user by userId
router.put('/:userId', userController.updateUser);

// DELETE request to delete user by userId
router.delete('/:userId', userController.deleteUser);





// POST request to follow a user
router.post('/:userId/follow', userController.followUser);

// POST request to unfollow a user
router.post('/:userId/unfollow', userController.unfollowUser);

// POST request to place an order
router.post('/order', userController.placeOrder);

// POST request to rate a user
router.post('/rate', userController.rateUser);

// POST request to switch account type
router.post('/switch-account', userController.switchAccountType);

module.exports = router;
