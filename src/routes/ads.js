const express = require('express');
const router = express.Router();
const Ads = require('../models/Ads');
const Address = require('../models/Adress');
const User = require('../models/User');
const Product = require('../models/product');
const { ROLES } = require('../constants');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Vendor = require('../models/Vendor');

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

router.get('/', auth, role.check(ROLES.Merchant, ROLES.Admin), async (req, res) => {
	const { page = 1, limit = 10 } = req.query;
	const vendorId = req.user.vendor;
	console.log(vendorId);

	try {
		let adsData;

		if (vendorId) {
			const vendorAds = await Vendor.findById(vendorId);
			adsData = await Ads.find({ isActive: true, _id: { $nin: [...vendorAds.ads, ...vendorAds.rejAds] } })
				.populate('user')
				.populate('address')
				.populate('product')
				.sort('-createdAt') // Changed from '-created' to '-createdAt'
				.limit(limit * 1)
				.skip((page - 1) * limit)
				.exec();
		} else {
			adsData = await Ads.find()
				.populate('user')
				.populate('address')
				.populate('product')
				.sort('-createdAt') // Changed from '-created' to '-createdAt'
				.limit(limit * 1)
				.skip((page - 1) * limit)
				.exec();
		}

		const count = await Ads.countDocuments();
		res.json({ adsData, totalPages: Math.ceil(count / limit), currentPage: Number(page), count });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});


// Get a Specific Ad by ID
router.get('/:adid', auth, role.check(ROLES.Merchant, ROLES.Admin), async (req, res) => {
	try {
		const ad = await Ads.findById(req.params.adid).populate('user').populate('address').populate('product');
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

// accept ads by vendor
router.post('/:adId/accept', auth, role.check(ROLES.Merchant), async (req, res) => {
	try {
      const {pricePerProduct, dispatchDay, remark} = req.body;
	  if(!pricePerProduct || !dispatchDay ||!remark){
		return res.status(401).json({ error: 'All fiels are required' });
	  }
		const adId = req.params.adId;
		const vendorId = req.user.vendor;

		// Check if the ad exists
		const ad = await Ads.findById(adId);
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}

		// Check if the vendor exists
		const vendor = await Vendor.findById(vendorId);
		if (!vendor) {
			return res.status(404).json({ error: 'Vendor not found' });
		}

		// Check if the vendor is already associated with the ad

		if (vendor.ads.includes(adId)) {
			return res.status(400).json({ error: 'Vendor already accepted ad' });
		}

		const vendorDetails = {
			pricePerProduct,
			dispatchDay,
			remark,
			vendor:vendorId
		};
		// Add the vendor to the ad's vendors array
		ad.vendors.push(vendorDetails);
		vendor.ads.push(adId);

		// Save the updated ad and vendor documents
		const adDoc = await ad.save();
		await vendor.save();

		res.json({ success: true, message: 'Successfully added ad', adDoc });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// accept ads by vendor
router.post('/:adId/reject', auth, role.check(ROLES.Merchant), async (req, res) => {
	try {
		const adId = req.params.adId;
		const vendorId = req.user.vendor;

		// Check if the ad exists
		const ad = await Ads.findById(adId);
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}

		// Check if the vendor exists
		const vendor = await Vendor.findById(vendorId);
		if (!vendor) {
			return res.status(404).json({ error: 'Vendor not found' });
		}

		// Check if the vendor is already associated with the ad
		if (vendor.ads.includes(adId)) {
			return res.status(400).json({ error: 'Vendor already accept the ad' });
		}

		// Check if the vendor is already associated with the ad
		if (vendor.rejAds.includes(adId)) {
			return res.status(400).json({ error: 'Vendor already reject the ad' });
		}

		vendor.rejAds.push(adId);

		await vendor.save();

		res.json({ success: true, message: 'Successfully rejected ad' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
