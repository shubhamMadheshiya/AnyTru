const express = require('express');
const router = express.Router();
const multer = require('multer');
const Mongoose = require('mongoose');

// Bring in Models & Utils
// const Product = require('../models/Product');
const Product = require('../models/Product');
const User = require('../models/User');
const Brand = require('..//models/brand');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkAuth = require('../utils/auth');
const { s3Upload } = require('../utils/storage');
const { getStoreProductsQuery, getStoreProductsWishListQuery } = require('../utils/queries');
const { ROLES, CATEGORIES, ENDPOINT } = require('../constants');
const NotificationService = require('../services/notificationService');

const storage = multer.memoryStorage();
const upload = multer({ storage });

//complete
// fetch product slug api
router.get('/item/:slug', async (req, res) => {
	try {
		const slug = req.params.slug;

		const productDoc = await Product.findOne({ slug, isActive: true }).populate({
			path: 'user'
			// select: 'name isActive slug'
		});
		console.log(productDoc);

		const hasNoUser = productDoc?.user === null || productDoc?.user?.isActive === false;
		console.log(hasNoUser);

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
	let isAdmin;
	const userDoc = await checkAuth(req);

	if (userDoc?.role == ROLES.Admin) {
		isAdmin = true;
	} else {
		isAdmin = false;
	}

	try {
		const name = req.params.name;
		let filter = { name: { $regex: new RegExp(name), $options: 'is' } };

		// If the user is not an admin, add isActive filter
		if (!isAdmin) {
			filter.isActive = true;
		}

		const productDoc = await Product.find(filter).populate('user');

		if (productDoc.length === 0) {
			// Fixed condition to check for no products found
			return res.status(404).json({
				message: 'No product found.'
			});
		}

		res.status(200).json({
			products: productDoc
		});
	} catch (error) {
		console.error(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch products api of particular user by admin
router.get('/list', async (req, res) => {
	const { page = 1, limit = 10, likes, category, isActive = true } = req.query;
	// const userId = req.user._id;
	let isAdmin;
	const userDoc = await checkAuth(req);
	console.log(userDoc);

	if (userDoc?.role == ROLES.Admin) {
		isAdmin = true;
	} else {
		isAdmin = false;
	}
	try {
		// Create a filter object
		let filter = {};

		// Filter by category if provided
		if (category) {
			filter.category = { $in: category.split(',').map((cat) => cat.trim()) };
		}
		// Filter by isActive
		if (isAdmin && isActive == 'false') {
			filter.isActive = false;
		} else {
			filter.isActive = true;
		}

		// if (isActive !== undefined) {
		// 	filter.isActive = isActive === 'true';
		// } else if (!isAdmin) {
		// 	filter.isActive = true; // Non-admin users can only see active products
		// }

		
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

		// Validate user
		const findUser = await User.findById(userId).populate({ path: 'followers', select: 'userId firstName avatar' });

		if (!findUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Validate required fields
		if (!sku) {
			return res.status(400).json({ error: 'You must enter a SKU.' });
		}

		if (!description || !name) {
			return res.status(400).json({ error: 'You must enter description and name.' });
		}

		// Validate categories
		const categoriesArray = Array.isArray(category) ? category : category.split(',').map((cat) => cat.trim());
		for (const cat of categoriesArray) {
			if (!Object.values(CATEGORIES).includes(cat)) {
				return res.status(404).json({ error: `No such category available: ${cat}` });
			}
		}

		// Check if SKU is unique
		const foundProduct = await Product.findOne({ sku });

		if (foundProduct) {
			return res.status(400).json({ error: 'This SKU is already in use.' });
		}

		// Upload image to S3
		const { imageUrl, imageKey } = await s3Upload(image);

		// Create product data
		const data = {
			sku,
			name,
			description,
			category: categoriesArray,
			user: findUser._id,
			imageUrl,
			imageKey,
			tags: Array.isArray(tags) ? tags : tags.split(',').map((tag) => tag.trim()),
			link
		};

		// Save product to the database
		const product = new Product(data);
		const savedProduct = await product.save();

		// Notify followers
		for (const follower of findUser.followers) {
			const notificationData = {
				userId: follower._id,
				title: follower.userId,
				avatar: follower.avatar,
				message: `uploaded a new post`,
				url: `${ENDPOINT.Product}${savedProduct._id}`,
				imgUrl: savedProduct.imageUrl
			};
			await NotificationService.createNotification(notificationData);
		}

		res.status(200).json({
			success: true,
			message: `Product has been added successfully!`,
			product: savedProduct
		});
	} catch (error) {
		console.error(error);
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
			.sort('-createdAt')
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
router.get('/:id', async (req, res) => {
	try {
		const productId = req.params.id;

		productDoc = await Product.findOne({ _id: productId, isActive: true }).populate('user');
		if (!productDoc) {
			return res.status(400).json({
				error: 'No data found'
			});
		}
		return res.status(200).json({productDoc});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// completed

//update product by Id (user and Admin)

router.put('/:id', auth, async (req, res) => {
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

		const productDoc = await Product.findOneAndUpdate(
			query,
			{ isActive },
			{
				new: true
			}
		);
		const notificationData = {
			userId: productDoc.user,
			title: productDoc.name,
			// avatar: productDoc.imageUrl,
			message: `Your Product is now Active`,
			url: `${ENDPOINT.Product}${productDoc._id}`,
			imgUrl: productDoc.imageUrl
		};
		const notification = await NotificationService.createNotification(notificationData);
		

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

router.put('/like/:productId', auth, async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user._id;

		const product = await Product.findById(productId)
		const findUser = await User.findById(userId);

		if(!findUser){
			res.status(404).json({error:'User not found'})
		}

		if (!product) {
			return res.status(404).json({
				success: false,
				message: 'Product not found!'
			});
		}

		const likeIndex = product.likes.indexOf(userId);
	

		if (likeIndex === -1) {
			// User has not liked the product, so like it
			product.likes.push(userId);
			message = 'Product liked successfully!';
			const notificationData = {
				userId: product.user,
				title: findUser.userId,
				avatar: findUser.avatar,
				message: `liked your post`,
				url: `${ENDPOINT.Product}${product._id}`,
				imgUrl: product.imageUrl
			};
			console.log(notificationData)
			const notification = await NotificationService.createNotification(notificationData);
			
		
		} else {
			// User has already liked the product, so dislike it
			product.likes.pull(userId);
			message = 'Product disliked successfully!';
		}

		await product.save();

		res.status(200).json({
			success: true,
			message,
			likes: product.likes.length
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			error: 'An internal server error occurred. Please try again later.'
		});
	}
});

module.exports = router;
