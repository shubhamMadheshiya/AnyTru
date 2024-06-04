const express = require('express');
const router = express.Router();

// Bring in Models & Utils
const Brand = require('../models/brand');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Merchant = require('../models/merchant');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const store = require('../utils/store');
const { ROLES, MERCHANT_STATUS } = require('../constants');

router.post('/add', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const name = req.body.name;
		const description = req.body.description;
		const isActive = req.body.isActive;

		if (!description || !name) {
			return res.status(400).json({ error: 'You must enter description & name.' });
		}

		const brand = new Brand({
			name,
			description,
			isActive
		});

		const brandDoc = await brand.save();

		res.status(200).json({
			success: true,
			message: `Brand has been added successfully!`,
			brand: brandDoc
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch store vendor api
router.get('/list', async (req, res) => {
	try {
		const vendor = await Vendor.find({
			isActive: true
		}).populate('user');

		res.status(200).json({
			vendor
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch vendors api
router.get('/', auth, role.check(ROLES.Admin, ROLES.Merchant), async (req, res) => {
	try {
		let vendor = null;

		if (req.user.merchant) {
			vendor = await Vendor.find({
				merchant: req.user.merchant
			}).populate('user');
		} else {
			vendor = await Brand.vendor({}).populate('user');
		}

		res.status(200).json({
			vendor
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.get('/:id', async (req, res) => {
	try {
		const brandId = req.params.id;

		const brandDoc = await Brand.findOne({ _id: brandId }).populate('merchant', '_id');

		if (!brandDoc) {
			return res.status(404).json({
				message: `Cannot find brand with the id: ${brandId}.`
			});
		}

		res.status(200).json({
			brand: brandDoc
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.get('/list/select', auth, role.check(ROLES.Admin, ROLES.Merchant), async (req, res) => {
	try {
		let brands = null;

		if (req.user.merchant) {
			brands = await Brand.find(
				{
					merchant: req.user.merchant
				},
				'name'
			);
		} else {
			brands = await Brand.find({}, 'name');
		}

		res.status(200).json({
			brands
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.put('/:id', auth, role.check(ROLES.Admin, ROLES.Merchant), async (req, res) => {
	try {
		const brandId = req.params.id;
		const update = req.body.brand;
		const query = { _id: brandId };
		const { slug } = req.body.brand;

		const foundBrand = await Brand.findOne({
			$or: [{ slug }]
		});

		if (foundBrand && foundBrand._id != brandId) {
			return res.status(400).json({ error: 'Slug is already in use.' });
		}

		await Brand.findOneAndUpdate(query, update, {
			new: true
		});

		res.status(200).json({
			success: true,
			message: 'Brand has been updated successfully!'
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.put('/:id/active', auth, role.check(ROLES.Admin, ROLES.Merchant), async (req, res) => {
	try {
		const brandId = req.params.id;
		const update = req.body.brand;
		const query = { _id: brandId };

		// disable brand(brandId) products
		if (!update.isActive) {
			const products = await Product.find({ brand: brandId });
			store.disableProducts(products);
		}

		await Brand.findOneAndUpdate(query, update, {
			new: true
		});

		res.status(200).json({
			success: true,
			message: 'Brand has been updated successfully!'
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.delete('/delete/:id', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const brandId = req.params.id;
		await deactivateMerchant(brandId);
		const brand = await Brand.deleteOne({ _id: brandId });

		res.status(200).json({
			success: true,
			message: `Brand has been deleted successfully!`,
			
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

const deactivateMerchant = async (brandId) => {
	const brandDoc = await Brand.findOne({ _id: brandId }).populate('merchant', '_id');
	if (!brandDoc || !brandDoc.merchant) return;
	const merchantId = brandDoc.merchant._id;
	const query = { _id: merchantId };
	const update = {
		status: MERCHANT_STATUS.Waiting_Approval,
		isActive: false,
		brand: null
	};
	return await Merchant.findOneAndUpdate(query, update, {
		new: true
	});
};

module.exports = router;
