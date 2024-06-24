const express = require('express');
const router = express.Router();
const role = require('../middleware/role');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { authorizeRole } = require('../middleware/authorizeRole');
const bcrypt = require('bcryptjs');
const { ROLES, MERCHANT_STATUS, ADMIN_EMAILS, ACCOUNTS } = require('../constants/index');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Merchant = require('../models/merchant');
const { checkUserId } = require('../middleware/checkUserId');
const { s3Upload, s3Delete } = require('../utils/storage');
const multer = require('multer');
const NotificationService = require('../services/notificationService');
const { ENDPOINT } = require('../constants/index');

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
				_id: { $ne: req.user._id },
				$or: [
					{ firstName: { $regex: regex } },
					{ lastName: { $regex: regex } },
					{ email: { $regex: regex } },
					{ userId: { $regex: regex } }
				]
			},
			{
				password: 0,
				_id: 0,
				provider: 0,
				address: 0,
				followers: 0,
				following: 0,
				orders: 0,
				vendor: 0,
				created: 0,
				phoneNumber: 0,
				merchantReq: 0,
				bio: 0
			}
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

router.get('/list', auth, async (req, res) => {
	try {
		const { page = 1, limit = 10, sortField = 'created', sortOrder = 'desc', accountType, role } = req.query;

		// Convert page and limit to numbers
		const pageNumber = parseInt(page, 10);
		const limitNumber = parseInt(limit, 10);

		// Allowed sort fields
		const allowedSortFields = ['followers', 'following', 'orders', 'created'];

		// Validate sort field
		if (!allowedSortFields.includes(sortField)) {
			return res.status(400).json({
				error: `Invalid sort field. Allowed fields are: ${allowedSortFields.join(', ')}`
			});
		}

		// Validate sort order
		if (sortOrder !== 'asc' && sortOrder !== 'desc') {
			return res.status(400).json({
				error: 'Invalid sort order. Allowed values are: asc, desc'
			});
		}

		// Build the sort object
		const sortOptions = {};
		sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

		// Define the projection object to exclude certain fields
		const projection = {
			password: 0,
			_id: 0,
			provider: 0,
			address: 0,
			followers: 0,
			following: 0,
			orders: 0,
			vendor: 0,
			created: 0,
			phoneNumber: 0,
			merchantReq: 0,
			bio: 0,
			posts: 0 // Exclude posts array
		};

		// Include additional fields in projection
		projection.accountType = 1;
		projection.role = 1;
		projection.avatar = 1;

		// Define the query object
		const query = { _id: { $ne: req.user._id } };

		// Add account type filter
		if (accountType) {
			if ([ACCOUNTS.Personal, ACCOUNTS.Creator].includes(accountType)) {
				query.accountType = accountType;
			} else {
				return res.status(400).json({
					error: `Invalid account type. Allowed values are: ${(ACCOUNTS.Personal, ACCOUNTS.Creator)}`
				});
			}
		}

		// Add role filter
		if (role) {
			if ([ROLES.Admin, ROLES.User, ROLES.Merchant].includes(role)) {
				query.role = role;
			} else {
				return res.status(400).json({
					error: `Invalid role. Allowed values are:${(ROLES.Admin, ROLES.User, ROLES.Merchant)}`
				});
			}
		}

		// Log the query and sorting options
		console.log('Query:', query);
		console.log('Sort options:', sortOptions);

		// Fetch users
		const users = await User.aggregate([
			{ $match: query },
			{
				$project: {
					username: 1,
					email: 1,
					accountType: 1,
					role: 1,
					avatar: 1,
					vendor:1,
					created:1,
					followersCount: { $size: '$followers' },
					followingCount: { $size: '$following' },
					postsCount: { $size: '$posts' }
				}
			},
			{ $sort: sortOptions },
			{ $skip: (pageNumber - 1) * limitNumber },
			{ $limit: limitNumber }
		]);

		// Fetch the total count of users matching the query
		const count = await User.countDocuments(query);

		// Log the users found
		console.log('Users found:', users);

		// Send response
		res.status(200).json({
			users,
			totalPages: Math.ceil(count / limitNumber),
			currentPage: pageNumber,
			count
		});
	} catch (error) {
		console.error('Error:', error);
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
		return res.status(200).json({ vendor: findVendorReq });
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
		const userDoc = await User.findById(userId, {
			password: 0,
			_id: 0,
			provider: 0,
			orders: 0,
			created: 0,
			merchantReq: 0,
			followers: 0,
			following: 0,
			address: 0,
			posts: 0
		}).populate({
			path: 'vendor',
			model: 'Vendor',
			select: '-created -rejAds -ads -merchantDoc'
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
router.post('/', auth, authorizeRole(ROLES.Admin), async (req, res) => {
	try {
		const { userId, email, firstName, lastName, password, role } = req.body;
		console;
		if (!email) {
			return res.status(400).json({ error: 'You must enter an email address.' });
		}

		if (!firstName) {
			return res.status(400).json({ error: 'You must enter your  name.' });
		}

		if (!password) {
			return res.status(400).json({ error: 'You must enter a password.' });
		}

		if (!userId) {
			return res.status(400).json({ error: 'You must enter a userId.' });
		}

		const existingUserEmail = await User.findOne({ email });

		if (existingUserEmail) {
			return res.status(400).json({ error: 'That email address is already in use.' });
		}
		const existingUserId = await User.findOne({ userId });

		if (existingUserId) {
			return res.status(400).json({ error: 'That User Id address is already in use.' });
		}

		// Hash the password
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(password, salt);

		// Create a new user instance
		const user = new User({
			email,
			userId,
			firstName,
			lastName,
			password: hash, // Assign the hashed password
			role
		});

		const registeredUser = await user.save();

		res.status(200).json({
			success: true,
			message: 'User has been created',
			// subscribed,
			user: {
				id: registeredUser.id,
				firstName: registeredUser.firstName,
				lastName: registeredUser.lastName,
				email: registeredUser.email,
				role: registeredUser.role
			}
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// // GET request to get user's info
router.get('/', auth, async (req, res) => {
	try {
		const findUser = await User.findOne(
			{ _id: req.user },
			{
				password: 0,
				provider: 0,
				orders: 0,
				created: 0,
				merchantReq: 0,
				avatarKey: 0,
				vendor: 0
			}
		).populate('address');
		if (!findUser) {
			return res.status(404).json({ error: 'User not found' });
		}
		console.log(findUser);

	const user = {
		_id:findUser._id,
		firstName: findUser.firstName,
		lastName: findUser.lastName,
		email: findUser.email,
		userId: findUser.userId,
		role: findUser.role,
		accountType: findUser.accountType,
		isActive: findUser.isActive,
		bio: findUser.bio,
		phoneNumber: findUser.phoneNumber,
		avatar: findUser.avatar,
		posts: findUser.posts ? findUser.posts.length : 0,
		followers: findUser.followers ? findUser.followers.length : 0,
		following: findUser.following ? findUser.following.length : 0,
		defaultAddress: findUser.address ? findUser.address.find((address) => address.isDefault == true) : null,
	
	};
		res.status(200).json({ user });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});

//getUser by Id
router.get('/:userId', auth, async (req, res) => {
	try {
		// Find the user by ID, exclude certain fields, and populate the address field
		const findUser = await User.findOne(
			{ _id: req.params.userId },
			{
				password: 0,
				provider: 0,
				orders: 0,
				created: 0,
				merchantReq: 0,
				avatarKey: 0,
				vendor: 0
			}
		).populate('address'); // Populate the address field
		console.log(findUser)

		// If user not found, return a 404 error
		if (!findUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Construct the user object to return
		const user = {
			_id:findUser._id,
			firstName: findUser.firstName,
			lastName: findUser.lastName,
			email: findUser.email,
			userId: findUser.userId,
			role: findUser.role,
			accountType: findUser.accountType,
			isActive: findUser.isActive,
			bio: findUser.bio,
			phoneNumber: findUser.phoneNumber,
			avatar: findUser.avatar,
			posts: findUser.posts ? findUser.posts.length : 0,
			followers: findUser.followers ? findUser.followers.length : 0,
			following: findUser.following ? findUser.following.length : 0,
			defaultAddress: findUser.address ? findUser.address.find((address) => address.isDefault == true) : null,
			isFollowing: findUser.followers ? findUser.followers.includes(req.user._id) : false
		};

		// Return the user object
		res.status(200).json({ user });
	} catch (error) {
		console.error('Error fetching user:', error);
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});

//upadte user

router.put('/:id', auth, upload.single('avatar'), async (req, res) => {
	try {
		const userId = req.params.id;
		const requesterId = req.user._id;
		const requesterRole = req.user.role;
		const { firstName, lastName, phoneNumber, bio, newUserId } = req.body;
		const avatar = req.file;

		// Find the user to check ownership
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: 'User not found.' });
		}

		// Check if the requester is the user themselves or an admin
		if (String(user._id) !== String(requesterId) && requesterRole !== ROLES.Admin) {
			return res.status(403).json({ error: 'You do not have permission to update this user.' });
		}

		// Check if new userId is already in use by another user
		if (newUserId && newUserId !== user.userId) {
			const existingUser = await User.findOne({ userId: newUserId });
			if (existingUser) {
				return res.status(400).json({ error: 'userId is already in use by another user.' });
			}
		}

		// Filter the update object to allow only specific fields and non-empty values
		const updateFields = { firstName, lastName, phoneNumber, bio, userId: newUserId };
		const allowedUpdates = {};
		Object.keys(updateFields).forEach((key) => {
			if (updateFields[key] !== undefined && updateFields[key].length > 0) {
				allowedUpdates[key] = updateFields[key];
			}
		});

		// Update the user
		const updatedUser = await User.findByIdAndUpdate(userId, allowedUpdates, { new: true });
		if (!updatedUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Handle avatar upload if present
		if (avatar) {
			if (updatedUser.avatarKey) {
				await s3Delete([updatedUser.avatarKey]);
			}
			const { imageUrl, imageKey } = await s3Upload(avatar);
			updatedUser.avatar = imageUrl;
			updatedUser.avatarKey = imageKey;
			await updatedUser.save();
		}

		// Prepare response data
		const data = {
			_id: updatedUser._id,
			userId: updatedUser.userId,
			firstName: updatedUser.firstName,
			lastName: updatedUser.lastName,
			phoneNumber: updatedUser.phoneNumber,
			bio: updatedUser.bio,
			avatar: updatedUser.avatar,
			createdAt: updatedUser.createdAt
		};

		res.status(200).json({
			success: true,
			message: 'User updated successfully!',
			user: data
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'Your request could not be processed. Please try again.'
		});
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
		res.status(200).json({ success: true, message: 'User deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});

// POST request to follow a user
router.post('/:userId/follow', auth, async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		const userToFollowId = req.params.userId;
		if (userToFollowId == req.user._id) {
			return res.status(403).json({ error: "You can't follow yourself" });
		}
		if (user.following.includes(userToFollowId)) {
			// Check if user is already following the user to be followed
			return res.status(400).json({ error: 'You are already following this user' });
		}

		user.following.push(userToFollowId);
		await user.save();

		// Update the user being followed
		const userToFollow = await User.findByIdAndUpdate(userToFollowId, { $addToSet: { followers: req.user._id } }, { new: true });

		const notificationData = {
			userId: userToFollow._id,
			title: user.firstName,
			avatar: user.avatar || '',
			message: `Started following you`,
			url: `${ENDPOINT.UserProfile}${user._id}`
		};
		const notification = await NotificationService.createNotification(notificationData);
		console.log(notification);

		res.status(200).json({ success: true, message: 'You are now following the user', follower: userToFollow.followers.length });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});

// POST request to unfollow a user
router.post('/:userId/unfollow', auth, async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		const userToUnfollowId = req.params.userId;

		if (userToUnfollowId == req.user._id) {
			return res.status(403).json({ error: "You can't unfollow yourself" });
		}

		// Check if user is not following the user to be unfollowed
		if (!user.following.includes(userToUnfollowId)) {
			return res.status(400).json({ error: 'You are not following this user' });
		}

		user.following.pull(userToUnfollowId);
		await user.save();

		// Update the user being unfollowed
		const userToUnfollow = await User.findByIdAndUpdate(userToUnfollowId, { $pull: { followers: req.user._id } }, { new: true });

		res.status(200).json({ success: true, message: 'You have unfollowed the user', follower: userToUnfollow.followers.length });
	} catch (error) {
		console.log(error)
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});

// GET request to get followers of a user by userId
router.get('/:userId/followers', auth, async (req, res) => {
	try {
		// Find the user by ID and populate the followers field
		const user = await User.findById(req.params.userId).populate('followers', 'firstName lastName userId avatar followers');

		// If user not found, return a 404 error
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Construct followers array with additional 'isFollowing' field
		const followers = user.followers.map((follower) => ({
			_id: follower._id,
			firstName: follower.firstName,
			lastName: follower.lastName,
			userId: follower.userId,
			avatar: follower.avatar,
			followersCount: follower.followers.length,
			isFollowing: follower.followers.includes(req.user._id)
		}));

		// Return the followers array
		res.status(200).json({ followers });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});


// GET request to get users followed by a user by userId
router.get('/:userId/following', auth, async (req, res) => {
	try {
		// Find the user by ID and populate the following field
		const user = await User.findById(req.params.userId)
			.populate('following', 'firstName lastName userId avatar followers');

		// If user not found, return a 404 error
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Construct following array with additional 'isFollowing' field
		const following = user.following.map(followedUser => ({
			_id: followedUser._id,
			firstName: followedUser.firstName,
			lastName: followedUser.lastName,
			userId: followedUser.userId,
			avatar: followedUser.avatar,
			followersCount: followedUser.followers.length,
			isFollowing: followedUser.followers.includes(req.user._id)
		}));

		// Return the following array
		res.status(200).json({ following });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Your request could not be processed. Please try again.' });
	}
});


// POST request to switch account type
// router.post('/switch-account', userController.switchAccountType);

module.exports = router;
