const express = require('express');
const router = express.Router();
const Ads = require('../models/Ads');
const Address = require('../models/Address');
const { auth } = require('../middleware/auth'); // Import authentication middleware

// Create an Ad
router.post('/', auth, async (req, res) => {
	try {
		// Create a new address if it doesn't exist
		const address = await Address.create(req.body.address);

		// Create the ad with the address reference
		const ad = await Ads.create({
			...req.body,
			address: address._id
		});

		res.status(201).json(ad);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get All Ads
router.get('/', async (req, res) => {
	try {
		const ads = await Ads.find().populate('address');
		res.json(ads);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get a Specific Ad by ID
router.get('/:id', async (req, res) => {
	try {
		const ad = await Ads.findById(req.params.id).populate('address');
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}
		res.json(ad);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Update an Ad
router.put('/:id', auth, async (req, res) => {
	try {
		const ad = await Ads.findByIdAndUpdate(req.params.id, req.body, { new: true });
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}
		res.json(ad);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Delete an Ad
router.delete('/:id', auth, async (req, res) => {
	try {
		const ad = await Ads.findByIdAndDelete(req.params.id);
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}
		res.json({ success: true });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
