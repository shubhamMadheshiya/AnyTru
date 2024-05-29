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
const { s3Upload } = require('../utils/storage');
const multer = require('multer');


const storage = multer.memoryStorage();

const upload = multer({ storage });



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

// UPDATE USER
router.put('/:userId', auth, upload.single('avatar'), async (req, res) => {
	let hash;
	try {
		const { firstName, lastName, phoneNumber, bio, userId } = req.body;
		const avatar = req.file;

		const data = {
			firstName,
			lastName,
			phoneNumber,
			bio,
			userId
		};

		// Hash the password if it is provided
		if (req.body.password) {
			const salt = await bcrypt.genSalt(10);
			hash = await bcrypt.hash(req.body.password, salt);
			data.password = hash;
		}

		// Check if the userId is unique
		const existingUser = await User.findOne({ userId });
		if (existingUser && existingUser._id.toString() !== req.params.userId) {
			return res.status(400).json({ message: 'userId is already in use by another user' });
		}

		// Handle avatar upload if present
		if (avatar) {
			const { imageUrl, imageKey } = await s3Upload(avatar);
			data.avatar = imageUrl;
		}

		// Update the user
		const updatedUser = await User.findOneAndUpdate({ _id: req.params.userId }, data, { new: true });
		if (!updatedUser) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json(updatedUser);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// DELETE request to delete user by userId
router.delete('/:userId', auth,  userController.deleteUser);

// POST request to follow a user
router.post('/:userId/follow', auth,  userController.followUser);

// POST request to unfollow a user
router.post('/:userId/unfollow', auth,  userController.unfollowUser);

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
