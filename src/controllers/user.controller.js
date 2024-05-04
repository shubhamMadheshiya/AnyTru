const User = require('../models/User');

// Controller function to create a new user
exports.createUser = async (req, res) => {
	try {
		const newUser = await User.create(req.body);
		res.status(201).json(newUser);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// Controller function to get user by userId
exports.getUserById = async (req, res) => {
	try {
        // console.log('console file is ',req.user)
		const user = await User.findOne({ _id: req.params.userId });
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to update user by userId
exports.updateUser = async (req, res) => {
	try {
		const updatedUser = await User.findOneAndUpdate({ userId: req.params.userId }, req.body, { new: true });
		if (!updatedUser) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json(updatedUser);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to delete user by userId
exports.deleteUser = async (req, res) => {
	try {
		const deletedUser = await User.findOneAndDelete({ userId: req.params.userId });
		if (!deletedUser) {
			return res.status(404).json({ message: 'User not found' });
		}
		res.status(200).json({ message: 'User deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};













// Controller function to follow another user
exports.followUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const userToFollowId = req.params.userId;

        // Check if user is already following the user to be followed
        if (user.following.includes(userToFollowId)) {
            return res.status(400).json({ message: 'You are already following this user' });
        }

        user.following.push(userToFollowId);
        await user.save();

        // Update the user being followed
        const userToFollow = await User.findByIdAndUpdate(userToFollowId, { $addToSet: { followers: req.user.userId } }, { new: true });

        res.status(200).json({ message: 'You are now following the user', user: userToFollow });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Controller function to unfollow a user
exports.unfollowUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const userToUnfollowId = req.params.userId;

        // Check if user is not following the user to be unfollowed
        if (!user.following.includes(userToUnfollowId)) {
            return res.status(400).json({ message: 'You are not following this user' });
        }

        user.following.pull(userToUnfollowId);
        await user.save();

        // Update the user being unfollowed
        await User.findByIdAndUpdate(userToUnfollowId, { $pull: { followers: req.user.userId } });

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
