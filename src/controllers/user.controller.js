const User = require('../models/User');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { s3Upload } = require('../utils/storage');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const NotificationService = require('../services/notificationService')
const { ENDPOINT } = require('../constants/index')
// Controller function to create a new user
exports.createUser = async (req, res) => {
	try {
		const { userId, email, firstName, lastName, password, role } = req.body;

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
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
};

// Controller function to get user
exports.getUser = async (req, res) => {
	try {
		
		const user = await User.findOne({ _id: req.user._id });
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to get user by userId
exports.getUserById = async (req, res) => {
	try {
	
		const user = await User.findOne({ _id: req.params.userId });
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to delete user by userId
exports.deleteUser = async (req, res) => {
	try {
		const findUser = await User.findById(req.params.userId);
		if (ADMIN_EMAILS.includes(findUser.email)) {
			return res.status(403).json({ error: 'You can delete Prime Adimin' });
		}
		const deletedUser = await User.findOneAndDelete({ _id: req.params.userId });
		if (!deletedUser) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json({ message: 'User deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to get followers of a user by userId
exports.getFollowers = async (req, res) => {
	try {
		const user = await User.findById(req.params.userId).populate('followers', 'firstName lastName email');
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json(user.followers);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to get users followed by a user by userId
exports.getFollowing = async (req, res) => {
	try {
		const user = await User.findById(req.params.userId).populate('following', 'firstName lastName email');
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json(user.following);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to follow another user
exports.followUser = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		const userToFollowId = req.params.userId;

		// Check if user is already following the user to be followed
		if (user.following.includes(userToFollowId)) {
			return res.status(400).json({ message: 'You are already following this user' });
		}

		user.following.push(userToFollowId);
		await user.save();

		// Update the user being followed
		const userToFollow = await User.findByIdAndUpdate(userToFollowId, { $addToSet: { followers: req.user._id } }, { new: true });

		const notificationData = {
			userId: userToFollow._id,
			title: user.firstName,
			avatar: user.avatar,
			message: `Started following you`,
			url: `${ENDPOINT.UserProfile}${user._id}`
		};
		const notification = await NotificationService.createNotification(notificationData);
	

		res.status(200).json({ message: 'You are now following the user', user: userToFollow });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: error.message });
	}
};

// Controller function to unfollow a user
exports.unfollowUser = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		const userToUnfollowId = req.params.userId;

		// Check if user is not following the user to be unfollowed
		if (!user.following.includes(userToUnfollowId)) {
			return res.status(400).json({ message: 'You are not following this user' });
		}

		user.following.pull(userToUnfollowId);
		await user.save();

		// Update the user being unfollowed
		await User.findByIdAndUpdate(userToUnfollowId, { $pull: { followers: req.user._id } });

		res.status(200).json({ message: 'You have unfollowed the user' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to place an order
exports.placeOrder = async (req, res) => {
	try {
		// Implement order creation logic here
		res.status(200).json({ message: 'Order placed successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to rate a user
exports.rateUser = async (req, res) => {
	try {
		const { userId, rating } = req.body;
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		user.rating = rating;
		await user.save();

		res.status(200).json({ message: 'User rated successfully', user });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to switch account type
exports.switchAccountType = async (req, res) => {
	try {
		const { userId, accountType } = req.body;
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		user.accountType = accountType;
		await user.save();

		res.status(200).json({ message: 'Account type switched successfully', user });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
