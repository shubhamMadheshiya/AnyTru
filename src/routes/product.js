const express = require('express');
const router = express.Router();
const multer = require('multer');
const Mongoose = require('mongoose');

// Bring in Models & Utils
const Product = require('../models/product');
const User = require('../models/User')
const Brand = require('..//models/brand');
const Category = require('../models/category');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkAuth = require('../utils/auth');
const { s3Upload } = require('../utils/storage');
const { getStoreProductsQuery, getStoreProductsWishListQuery } = require('../utils/queries');
const { ROLES, CATEGORIES } = require('../constants');

const storage = multer.memoryStorage();
const upload = multer({ storage });

//complete
// fetch product slug api
router.get('/item/:slug', async (req, res) => {
	try {
		const slug = req.params.slug;

		const productDoc = await Product.findOne({ slug, isActive: true }).populate({
			path: 'user',
			select: 'name isActive slug'
		});

		const hasNoUser = productDoc?.user === null || productDoc?.user?.isActive === false;

		if (!productDoc || hasNoUser) {
			return res.status(404).json({
				message: 'No product found.'
			});
		}

		res.status(200).json({
			product: productDoc
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// complete
// fetch product name search api
router.get('/list/search/:name', async (req, res) => {
	try {
		const name = req.params.name;

		const productDoc = await Product.find(
			{ name: { $regex: new RegExp(name), $options: 'is' }, isActive: true }
			// { name: 1, slug: 1, imageUrl: 1, price: 1, _id: 0 }
		).populate('user');

		if (productDoc.length < 0) {
			return res.status(404).json({
				message: 'No product found.'
			});
		}

		res.status(200).json({
			products: productDoc
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});





// fetch products api of particular user by admin
router.get('/list', auth, async (req, res) => {
	const { page = 1, limit = 10, likes, category, isActive = false } = req.query;
	const userId = req.user._id;
	const isAdmin = req.user.isAdmin;

	try {
		// Create a filter object
		let filter = {};

		// Filter by category if provided
		if (category) {
			filter.category = { $in: category.split(',').map((cat) => cat.trim()) };
		}

		// Filter by isActive
		if (isActive !== undefined) {
			filter.isActive = isActive === 'true';
		} else if (!isAdmin) {
			filter.isActive = true; // Non-admin users can only see active products
		}

		// Find products with the given filters
		let productsQuery = Product.find(filter)
			.populate('user')
			.sort('-createdAt')
			.limit(limit * 1)
			.skip((page - 1) * limit);

		// Sort by likes if requested
		if (likes) {
			productsQuery = productsQuery.sort({ likes: -1 });
		}

		const products = await productsQuery.exec();

		// Count documents with the given filters
		const count = await Product.countDocuments(filter);

		res.status(200).json({
			products,
			totalPages: Math.ceil(count / limit),
			currentPage: Number(page),
			count
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'Internal server error'
		});
	}
});


// add product api
router.post('/add', auth, upload.single('image'), async (req, res) => {
	try {
		const { sku, name, description, tags, link, category } = req.body;
		const userId = req.user._id;
		const image = req.file;

		const findUser = await User.findById(userId);

		if (!findUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		if (!sku) {
			return res.status(400).json({ error: 'You must enter sku.' });
		}

		if (!description || !name) {
			return res.status(400).json({ error: 'You must enter description & name.' });
		}

		// Validate categories
		const categoriesArray = Array.isArray(category) ? category : category.split(',').map(cat => cat.trim());
		for (const cat of categoriesArray) {
			if (!Object.values(CATEGORIES).includes(cat)) {
				return res.status(404).json({ error: `No such category available: ${cat}` });
			}
		}

		const foundProduct = await Product.findOne({ sku });

		if (foundProduct) {
			return res.status(400).json({ error: 'This sku is already in use.' });
		}

		const { imageUrl, imageKey } = await s3Upload(image);

		const data = {
			sku,
			name,
			description,
			category: categoriesArray,
			user: userId,
			imageUrl,
			imageKey,
			tags: Array.isArray(tags) ? tags : tags.split(',').map((tag) => tag.trim()),
			link
		};

		const product = new Product(data);
		const savedProduct = await product.save();

		res.status(200).json({
			success: true,
			message: `Product has been added successfully!`,
			product: savedProduct
		});
	} catch (error) {
		console.log(error);
		return res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});


// fetch products api of particular user
router.get('/', auth, async (req, res) => {
	const { page = 1, limit = 10 } = req.query;

	const userId = req.user._id;

	try {
		const products = await Product.find({ user: userId })
			.populate('user')
			.sort('-created')
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

		const count = await Product.countDocuments();

		res.status(200).json({
			products,
			totalPages: Math.ceil(count / limit),
			currentPage: Number(page),
			count
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'Internal server error'
		});
	}
});

// fetch product api of particular product by it's Id
router.get('/:id', auth, async (req, res) => {
	try {
		const productId = req.params.id;

		productDoc = await Product.findOne({ _id: productId, isActive: true }).populate('user');
		if (!productDoc) {
			return res.status(400).json({
				error: 'No data found'
			});
		}
		return res.status(200).json(productDoc);
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// completed

//update product by Id (user and Admin)

router.put('/:id', auth, async (req, res) => {
	console.log(req.body);
	try {
		const productId = req.params.id;
		const update = req.body;
		const query = { _id: productId };
		const { sku, slug } = req.body;

		const foundProduct = await Product.findOne({
			$or: [{ slug }, { sku }]
		});

		if (foundProduct && foundProduct._id != productId) {
			return res.status(400).json({ error: 'Sku or slug is already in use.' });
		}

		await Product.findOneAndUpdate(query, update, {
			new: true
		});

		res.status(200).json({
			success: true,
			message: 'Product has been updated successfully!'
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.put('/:id/active', auth, async (req, res) => {
	try {
		const productId = req.params.id;
		const isActive = req.body.isActive; // Ensure isActive is defined
		if (isActive === undefined) {
			return res.status(400).json({ error: 'isActive field is missing in the request body.' });
		}

		const query = { _id: productId };

		await Product.findOneAndUpdate(
			query,
			{ isActive },
			{
				new: true
			}
		);

		res.status(200).json({
			success: true,
			message: 'Product has been updated successfully!'
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'An internal server error occurred. Please try again later.'
		});
	}
});


//completed
//delete productby Id (Admin & User)
router.delete('/delete/:id', auth, async (req, res) => {
	try {
		const product = await Product.deleteOne({ _id: req.params.id });

		res.status(200).json({
			success: true,
			message: `Product has been deleted successfully!`,
			product
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

module.exports = router;
