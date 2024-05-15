const express = require('express');
const router = express.Router();
const role = require('../middleware/role');
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth')
const {authorizeRole} = require('../middleware/authorizeRole')
const { ROLES } = require('../constants/index');
const User = require('../models/User');
const {checkUserId}= require('../middleware/checkUserId')


// search users api
router.get('/search', auth,  async (req, res) => {
  try {
    const { search } = req.query;

    const regex = new RegExp(search, 'i');

    const users = await User.find(
			{
				$or: [
					{ firstName: { $regex: regex } },
					{ lastName: { $regex: regex } },
					{ email: { $regex: regex } },
					{ userId: { $regex: regex } }
				]
			},
			{ password: 0, _id: 0 }
		)
        // .populate('user', 'name'); merchant

    res.status(200).json({
      users
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});


// fetch users api
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const users = await User.find({}, { password: 0, _id: 0 })
      .sort('-created')
    //   .populate('merchant', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments();

    res.status(200).json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      count
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

//get merchant
router.get('/me', auth, async (req, res) => {
	try {
		const user = req.user._id;
		const userDoc = await User.findById(user, { password: 0 }).populate({
			path: 'merchant',
			model: 'Merchant',
			populate: {
				path: 'brand',
				model: 'Brand'
			}
		});

		res.status(200).json({
			user: userDoc
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

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


// GET request to get followers of a user by userId
router.get('/:userId/followers', auth,  userController.getFollowers);

// GET request to get users followed by a user by userId
router.get('/:userId/following', auth,  userController.getFollowing);


module.exports = router;
