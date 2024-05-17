const express = require('express');
const router = express.Router();
const Ads = require('../models/Ads');
const Address = require('../models/Adress');
const User = require('../models/User');
const Product = require('../models/product');
const { ROLES } = require('../constants');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Create an Ad
router.post('/:productId', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const productId = req.params.productId;
		const { pricePerProduct, quantity } = req.body;

		if (!pricePerProduct || !quantity) {
			return res.status(400).json({ error: 'Please provide price and quantity' }); // Changed status code to 400 Bad Request
		}

		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		const address = await Address.findOne({ user: userId, isDefault: true });

		if (!address) {
			return res.status(404).json({ error: "User doesn't have a default address" });
		}

		const product = await Product.findOne({ _id: productId, isActive: true });

		if (!product) {
			return res.status(404).json({ error: 'Product not found' });
		}

		const existingAd = await Ads.findOne({ user: userId, product: productId });

		if (existingAd) {
			return res.status(400).json({ error: 'You already have an ad for this product' }); // Changed status code to 400 Bad Request
		}

		const ads = new Ads({
			user: user._id,
			product: product._id,
			address: address._id,
			pricePerProduct,
			quantity
		});
		const savedAd = await ads.save();
		res.status(201).json({
			success: true,
			message: 'Ad has been added successfully!',
			ad: savedAd // Changed variable name to clarify it's a single ad
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get All Ads
router.get('/', auth, role.chech(ROLES.Merchant, ROLES.Admin), async (req, res) => {
	const { page = 1, limit = 10 } = req.query;

	try {
		const ads = await Ads.find({ isActive: true })
			.populate('user')
			.populate('address')
			.populate('product')
			.sort('-created')
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();
		const count = await Ads.countDocuments();
		res.json({ ads, totalPages: Math.ceil(count / limit), currentPage: Number(page), count });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get a Specific Ad by ID
router.get('/:id', async (req, res) => {
	try {
		const ad = await Ads.findById(req.params.id).populate('user').populate('address').populate('product');
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
router.put('/:adId', auth, async (req, res) => {
	try {
		const ad = await Ads.findByIdAndUpdate(req.params.adId, req.body, { new: true });
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}
		res.json({ success: true, message: 'Ad has been updated successfully!', ad });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// // Delete an Ad
// router.delete('/:id', auth, async (req, res) => {
// 	try {
// 		const ad = await Ads.findByIdAndDelete(req.params.id);
// 		if (!ad) {
// 			return res.status(404).json({ error: 'Ad not found' });
// 		}
// 		res.json({ success: true });
// 	} catch (error) {
// 		console.error(error);
// 		res.status(500).json({ error: 'Internal server error' });
// 	}
// });

module.exports = router;
