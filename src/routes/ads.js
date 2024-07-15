const express = require('express');
const router = express.Router();
const Ads = require('../models/Ads');
const Address = require('../models/Adress');
const User = require('../models/User');
const Product = require('../models/Product');
const { ROLES, ENDPOINT } = require('../constants');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Vendor = require('../models/Vendor');
const NotificationService = require('../services/notificationService');

// Create an Ad
router.post('/add/:productId', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const productId = req.params.productId;
		const { pricePerProduct, quantity, addressId } = req.body;

		if (!pricePerProduct || !quantity) {
			return res.status(400).json({ error: 'Please provide price and quantity' }); // Changed status code to 400 Bad Request
		}

		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		let address;

		if (!addressId) {
			address = await Address.findOne({ user: userId, isDefault: true });
		} else {
			const findAddress = await Address.findById(addressId);

			if (!findAddress) {
				return res.status(404).json({ error: 'Address not found' });
			}

			address = findAddress;
		}

		const product = await Product.findOne({ _id: productId, isActive: true });

		if (!product) {
			return res.status(404).json({ error: 'Product not found' });
		}

		// const existingAd = await Ads.findOne({ user: userId, product: productId });

		// if (existingAd) {
		// 	return res.status(400).json({ error: 'You already have an ad for this product' }); // Changed status code to 400 Bad Request
		// }

		const ads = new Ads({
			user: user,
			product,
			address,
			pricePerProduct,
			quantity,
			category: product.category
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

// Get user's ads
router.get('/myAds', auth, async (req, res) => {
	const userId = req.user._id;
	const { isActive, page = 1, limit = 10 } = req.query;

	let filter = { user: userId };

	// Filtering by isActive
	if (isActive !== undefined) {
		filter.isActive = isActive === 'true';
	}

	try {
		const adsData = await Ads.find(filter)
			.populate('user', '_id firstName userId isActive avatar role')
			.populate('product', '_id sku name imageUrl description isActive category ')
			.populate('address', '_id city')
			.sort({ createdAt: -1 }) // Default sorting by createdAt in descending order
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

		const count = await Ads.countDocuments(filter);

		res.json({ adsData, totalPages: Math.ceil(count / limit), currentPage: Number(page), count });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get list of all products with filter
router.get('/list', auth, role.check(ROLES.Merchant, ROLES.Admin), async (req, res) => {
	const { page = 1, limit = 10, pricePerProduct, category, quantity, isActive, sortField, sortOrder } = req.query;
	const vendorId = req.user.vendor;
	const userRole = req.user.role;

	let filter = {};
	let sort = {};

	if (pricePerProduct) {
		filter.pricePerProduct = { $lte: pricePerProduct };
	}

	if (category) {
		filter.category = { $in: category.split(',') };
	}

	if (quantity) {
		filter.quantity = { $gte: quantity };
	}

	if (sortField && sortOrder) {
		sort[sortField] = sortOrder === 'asc' ? 1 : -1;
	} else {
		sort = { createdAt: -1 }; // Default sorting by createdAt in descending order
	}

	// Filtering by isActive
	if (isActive !== undefined) {
		if (isActive === 'false' && userRole !== ROLES.Admin) {
			return res.status(403).json({ error: 'You are not authorized to view inactive ads' });
		}
		filter.isActive = isActive === 'true';
	} else if (userRole !== ROLES.Admin) {
		filter.isActive = true; // Default to only active ads for non-admin users
	}

	try {
		let adsData;

		if (vendorId) {
			const vendorAds = await Vendor.findById(vendorId);
			adsData = await Ads.find({ ...filter, _id: { $nin: [...vendorAds.ads, ...vendorAds.rejAds] } })
				.populate('user', '_id firstName userId isActive avatar role')
				.populate('address', '_id city')
				.populate('product', '_id sku name imageUrl description isActive category')
				.sort(sort)
				.limit(limit * 1)
				.skip((page - 1) * limit)
				.exec();
		} else {
			adsData = await Ads.find(filter)
				.populate('user', '_id firstName userId isActive avatar role')
				.populate('address', '_id city')
				.populate('product', '_id sku name imageUrl description isActive category')
				.sort(sort)
				.limit(limit * 1)
				.skip((page - 1) * limit)
				.exec();
		}

		const count = await Ads.countDocuments(filter);
		res.json({ adsData, totalPages: Math.ceil(count / limit), currentPage: Number(page), count });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});
////````inActive not to merchant also show to user
// Get a Specific Ad by ID
router.get('/:adid', auth, async (req, res) => {
	const role = req.user.role;

	let ad;

	try {
		if (role == ROLES.User) {
			ad = await Ads.findOne({ _id: req.params.adid, user: req.user._id })
				.populate('user')
				.populate('address')
				.populate('product');
		}
		if (role == ROLES.Admin) {
			ad = await Ads.findOne({ _id: req.params.adid }).populate('user').populate('address').populate('product');
		}

		if (role == ROLES.Merchant) {
			ad = await Ads.findOne({ _id: req.params.adid, isActive: true }).populate('user').populate('address').populate('product');
		}

		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}
		res.json({ ad });
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
		const { pricePerProduct, dispatchDay, remark } = req.body;
		if (!pricePerProduct || !dispatchDay || !remark) {
			return res.status(401).json({ error: 'All fiels are required' });
		}
		const adId = req.params.adId;
		const vendorId = req.user.vendor;

		// Check if the ad exists
		const ad = await Ads.findById(adId).populate('product', 'imageUrl');
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}

		// Check if the vendor exists
		const vendor = await Vendor.findById(vendorId).populate('user', 'avatar, firstName');
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
			vendor: vendorId
		};
		// Add the vendor to the ad's offers array
		ad.offers.push(vendorDetails);
		vendor.ads.push(adId);

		// Save the updated ad and vendor documents
		const adDoc = await ad.save();
		await vendor.save();

		//Notification to user
		const notificationData = {
			userId: adDoc.user,
			title: vendor.user.firstName,
			avatar: vendor.user.avatar || '',
			message: `accept your ad at ptice ₹${pricePerProduct} per Product`,
			url: `${ENDPOINT.UserProfile}${vendor.user._id}`,
			imgUrl: ad.product.imageUrl || ''
		};
		const notification = await NotificationService.createNotification(notificationData);

		res.json({ success: true, message: 'Successfully added ad', adDoc });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// cancel ads by vendor
router.put('/:adId/cancel', auth, role.check(ROLES.Merchant), async (req, res) => {
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

		// Check if the vendor has already accepted the ad
		const offerIndex = ad.offers.findIndex((offer) => offer.vendor.toString() === vendorId.toString());
		if (offerIndex === -1) {
			return res.status(400).json({ error: 'Vendor yet not accept the ad' });
		}

		// Remove the offer from the ad's offers array
		ad.offers.splice(offerIndex, 1);
		vendor.ads.pull(adId);

		// Save the updated ad and vendor documents
		const adDoc = await ad.save();
		await vendor.save();

		res.json({ success: true, message: 'Successfully cancelled ad' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// reject ads by vendor
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

// Deactivate an Ad
router.put('/:adId/active', auth, async (req, res) => {
	try {
		const adId = req.params.adId;
		const userId = req.user._id;
		const isActive = req.body.isActive;

		// Check if the ad exists
		const ad = await Ads.findById(adId);
		if (!ad) {
			return res.status(404).json({ error: 'Ad not found' });
		}

		// Check if the user is either the admin or the owner of the ad
		if (req.user.role === ROLES.Admin || ad.user.toString() === userId.toString()) {
			// Update the ad to deactivate it
			ad.isActive = isActive;
			await ad.save();

			return res.json({ success: true, message: 'Ad deactivated successfully' });
		} else {
			return res.status(403).json({ error: 'You are not authorized to deactivate this ad' });
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// Get all accepted and rejected ads for a vendor
router.get('/myVendorAds/status', auth, role.check(ROLES.Merchant), async (req, res) => {
	try {
		const vendorId = req.user.vendor;
		const { status = 'accepted', page = 1, limit = 10 } = req.query;

		// Check if the vendor exists
		const vendor = await Vendor.findById(vendorId);
		if (!vendor) {
			return res.status(404).json({ error: 'Vendor not found' });
		}

		let ads;
		if (status === 'accepted') {
			ads = vendor.ads;
		} else if (status === 'rejected') {
			ads = vendor.rejAds;
		} else {
			return res.status(400).json({ error: 'Invalid status' });
		}

		// Pagination
		const totalAds = ads.length;
		const startIndex = (page - 1) * limit;
		const endIndex = page * limit;
		const paginatedAds = ads.slice(startIndex, endIndex);

		// Fetch detailed ad information for each ad ID in the paginated list
		const adsDetails = await Ads.find({ _id: { $in: paginatedAds } })
			.populate('user', '_id firstName userId isActive avatar role')
			.populate('address', '_id city')
			.populate('product', '_id sku name imageUrl description isActive category')
			.exec();

		res.json({
			ads: adsDetails,
			totalPages: Math.ceil(totalAds / limit),
			currentPage: Number(page),
			count: totalAds
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});
module.exports = router;
