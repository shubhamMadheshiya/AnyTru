const express = require('express');
const router = express.Router();

// Bring in Models & Helpers
const Address = require('../models/Adress');
const auth = require('../middleware/auth');
const User = require('../models/User');

// add address api
router.post('/add', auth, async (req, res) => {
	try {
		const user = req.user;
		const findUser = await User.findById(user._id);

		if (!findUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		const address = new Address({
			...req.body,
			user: user._id
		});

		if (address.isDefault === true) {
			await Address.updateMany({ user: user._id }, { $set: { isDefault: false } });
		}
		const addressDoc = await address.save();
		findUser.address.push(addressDoc);
		findUser.save();

		res.status(200).json({
			success: true,
			message: `Address has been added successfully!`,
			address: addressDoc
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch all addresses api
router.get('/', auth, async (req, res) => {
	try {
		const addresses = await Address.find({ user: req.user._id });

		res.status(200).json({
			addresses
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.get('/:id', async (req, res) => {
	try {
		const addressId = req.params.id;

		const addressDoc = await Address.findOne({ _id: addressId });

		if (!addressDoc) {
			res.status(404).json({
				message: `Cannot find Address with the id: ${addressId}.`
			});
		}

		res.status(200).json({
			address: addressDoc
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.put('/:id', async (req, res) => {
	try {
		const addressId = req.params.id;
		const update = req.body;
		const query = { _id: addressId };

		await Address.findOneAndUpdate(query, update, {
			new: true
		});

		res.status(200).json({
			success: true,
			message: 'Address has been updated successfully!'
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.delete('/delete/:id', auth, async (req, res) => {
	try {
		const findUser = await User.findById(req.user._id);
		if (!findUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
		if (!address) {
			return res.status(404).json({ error: 'Address not found' });
		}

		// Remove the deleted address from the user's address list
		findUser.address.pull(address);
		await findUser.save();

		// Check if there is any other default address remaining
		const defaultAddressExists = await Address.findOne({ user: req.user._id, isDefault: true });

		if (!defaultAddressExists) {
			// If no default address exists, set the first address in the list as the default
			const nextAddress = await Address.findOne({ user: req.user._id });
			if (nextAddress) {
				nextAddress.isDefault = true;
				await nextAddress.save();
			}
		}

		res.status(200).json({
			success: true,
			message: `Address has been deleted successfully!`
		});
	} catch (error) {
		console.error('Error deleting address:', error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

module.exports = router;
