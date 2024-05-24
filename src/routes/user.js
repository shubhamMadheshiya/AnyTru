const express = require('express');
const router = express.Router();
const role = require('../middleware/role');
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const { authorizeRole } = require('../middleware/authorizeRole');
const { ROLES, MERCHANT_STATUS } = require('../constants/index');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Merchant = require('../models/merchant');
const { checkUserId } = require('../middleware/checkUserId');

// search users api
router.get('/search', auth, async (req, res) => {
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
		);
		// .populate('user', 'name'); merchant

		res.status(200).json({
			users
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch users api
router.get('/list', auth, async (req, res) => {
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
// get merchant status

router.get('/vendor/status', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const findVendorReq = await Merchant.findOne({ user: userId }, { status: 1, _id: 0 });
		if (!findVendorReq) {
			return res.status(400).json({ error: 'No request found' });
		}
		return res.status(200).json(findVendorReq);
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

//get merchant
router.get('/vendor', auth, role.check(ROLES.Merchant), async (req, res) => {
	try {
		const userId = req.user._id;
		const userDoc = await User.findById(userId, { password: 0 }).populate({
			path: 'vendor',
			model: 'Vendor'
			// populate: {
			// 	path: 'brand',
			// 	model: 'Brand'
			// }
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
router.get('/',auth, userController.getUser);

// GET request to get user by userId
router.get('/:userId', auth, userController.getUserById);

// PUT request to update user by userId
router.patch('/:userId', auth, authorizeRole(ROLES.User), userController.updateUser);

// DELETE request to delete user by userId
router.delete('/:userId', auth, authorizeRole(ROLES.User), userController.deleteUser);

// POST request to follow a user
router.post('/:userId/follow', auth, authorizeRole(ROLES.User), userController.followUser);

// POST request to unfollow a user
router.post('/:userId/unfollow', auth, authorizeRole(ROLES.User), userController.unfollowUser);

// POST request to place an order
// router.post('/order', userController.placeOrder);

// POST request to rate a user
router.post('/rate', userController.rateUser);

// POST request to switch account type
router.post('/switch-account', userController.switchAccountType);

// GET request to get followers of a user by userId
router.get('/:userId/followers', auth, userController.getFollowers);

// GET request to get users followed by a user by userId
router.get('/:userId/following', auth, userController.getFollowing);

module.exports = router;
