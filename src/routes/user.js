const express = require('express');
const router = express.Router();
const role = require('../middleware/role');
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const { authorizeRole } = require('../middleware/authorizeRole');
const { ROLES, MERCHANT_STATUS, ADMIN_EMAILS } = require('../constants/index');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Merchant = require('../models/merchant');
const { checkUserId } = require('../middleware/checkUserId');
const { s3Upload, s3Delete } = require('../utils/storage');
const multer = require('multer');

const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
	// Accept only specific file types (e.g., images and PDFs)
	if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
		cb(null, true);
	} else {
		cb(new Error('Invalid file type. Only JPEG and PNG files are allowed.'), false);
	}
};

// Multer configuration
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
	},
	fileFilter: fileFilter
});

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
		return res.status(200).json({findVendorReq});
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
router.get('/', auth, userController.getUser);

//getUser by Id
router.get('/:userId', auth, userController.getUserById);

// UPDATE USER
router.put('/:userId', auth, upload.single('avatar'), async (req, res) => {
	
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

		// Check if the userId is unique
		const existingUser = await User.findOne({ userId });
		if (existingUser && userId !== undefined) {
			return res.status(400).json({ error: 'userId is already in use by another user' });
		}
		

		// Update the user
		const updatedUser = await User.findOneAndUpdate({ _id: req.params.userId }, data, { new: true });
		if (!updatedUser) {
			return res.status(404).json({ error : 'User not found' });
		}

		// Handle avatar upload if present
		if (avatar) {
			if (updatedUser.avatarKey) {
				const deleteImg = await s3Delete([updatedUser.avatarKey]);
			}
			const { imageUrl, imageKey } = await s3Upload(avatar);
			updatedUser.avatar = imageUrl;
			updatedUser.avatarKey = imageKey;
			updatedUser.save();
		}
		res.status(200).json({success: true, message:"Updated Successfully"});
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});

// DELETE request to delete user by userId
router.delete('/:userId', auth, async (req, res) => {
	try {
		const findUser = await User.findById(req.params.userId);
		if (ADMIN_EMAILS.includes(findUser.email)) {
			return res.status(403).json({ error: 'You can delete Prime Adimin' });
		}
			if (findUser.avatarKey) {
				const deleteImg = await s3Delete([findUser.avatarKey]);
			}
		const deletedUser = await User.findOneAndDelete({ _id: req.params.userId });
		if (!deletedUser) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json({ success: true ,message: 'User deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: "Your request could not be processed. Please try again." });
	}
}
);

// POST request to follow a user
router.post('/:userId/follow', auth, userController.followUser);

// POST request to unfollow a user
router.post('/:userId/unfollow', auth, userController.unfollowUser);


// POST request to switch account type
router.post('/switch-account', userController.switchAccountType);

// GET request to get followers of a user by userId
router.get('/:userId/followers', auth, userController.getFollowers);

// GET request to get users followed by a user by userId
router.get('/:userId/following', auth, userController.getFollowing);

module.exports = router;
