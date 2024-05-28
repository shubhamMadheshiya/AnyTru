const express = require('express');
const router = express.Router();
const multer = require('multer');
const Mongoose = require('mongoose');

// Bring in Models & Utils
const Product = require('../models/product');
const Brand = require('..//models/brand');
const Category = require('../models/category');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const checkAuth = require('../utils/auth');
const { s3Upload } = require('../utils/storage');
const { getStoreProductsQuery, getStoreProductsWishListQuery } = require('../utils/queries');
const { ROLES } = require('../constants');

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

// fetch store products by advanced filters api
router.get('/list', async (req, res) => {
	try {
		let { sortOrder, rating, max, min, category, brand, page = 1, limit = 10 } = req.query;
		sortOrder = JSON.parse(sortOrder);

		const categoryFilter = category ? { category } : {};
		const basicQuery = getStoreProductsQuery(min, max, rating);

		const userDoc = await checkAuth(req);
		const categoryDoc = await Category.findOne({
			slug: categoryFilter.category,
			isActive: true
		});

		if (categoryDoc) {
			basicQuery.push({
				$match: {
					isActive: true,
					_id: {
						$in: Array.from(categoryDoc.products)
					}
				}
			});
		}

		const brandDoc = await Brand.findOne({
			slug: brand,
			isActive: true
		});

		if (brandDoc) {
			basicQuery.push({
				$match: {
					'brand._id': { $eq: brandDoc._id }
				}
			});
		}

		let products = null;
		const productsCount = await Product.aggregate(basicQuery);
		const count = productsCount.length;
		const size = count > limit ? page - 1 : 0;
		const currentPage = count > limit ? Number(page) : 1;

		// paginate query
		const paginateQuery = [{ $sort: sortOrder }, { $skip: size * limit }, { $limit: limit * 1 }];

		if (userDoc) {
			const wishListQuery = getStoreProductsWishListQuery(userDoc.id).concat(basicQuery);
			products = await Product.aggregate(wishListQuery.concat(paginateQuery));
		} else {
			products = await Product.aggregate(basicQuery.concat(paginateQuery));
		}

		res.status(200).json({
			products,
			totalPages: Math.ceil(count / limit),
			currentPage,
			count
		});
	} catch (error) {
		console.log('error', error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});


// add product api
router.post('/add', auth, upload.single('image'), async (req, res) => {
	try {
		const sku = req.body.sku;
		const name = req.body.name;
		const description = req.body.description;
		const user = req.user._id;
		const image = req.file;
		const tags = req.body.tags;
		const category = req.body.category;
		
		if (!sku) {
			return res.status(400).json({ error: 'You must enter sku.' });
		}

		if (!description || !name) {
			return res.status(400).json({ error: 'You must enter description & name.' });
		}

		const foundProduct = await Product.findOne({ sku });

		if (foundProduct) {
			return res.status(400).json({ error: 'This sku is already in use.' });
		}

		const { imageUrl, imageKey } = await s3Upload(image);

		const product = new Product({
			sku,
			name,
			description,
			category,
			// isActive,
			user,
			imageUrl,
			imageKey,
			tags
		});

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

// fetch products api of particular user by admin
router.get('/all', auth, role.check(ROLES.Admin), async (req, res) => {
	const { page = 1, limit = 10 } = req.query;

	try {
		const products = await Product.find({})
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

//complete

// add product api
router.post('/add', auth, upload.single('image'), async (req, res) => {
	try {
		const sku = req.body.sku;
		const name = req.body.name;
		const description = req.body.description;
		// const isActive = req.body.isActive;
		const user = req.user._id;
		const image = req.file;
		const tags = req.body.tags;
		const category = req.body.category;
		console.log(req.body.tags);

		if (!sku) {
			return res.status(400).json({ error: 'You must enter sku.' });
		}

		if (!description || !name) {
			return res.status(400).json({ error: 'You must enter description & name.' });
		}

		const foundProduct = await Product.findOne({ sku });

		if (foundProduct) {
			return res.status(400).json({ error: 'This sku is already in use.' });
		}

		const { imageUrl, imageKey } = await s3Upload(image);

		const product = new Product({
			sku,
			name,
			description,
			category,
			// isActive,
			user,
			imageUrl,
			imageKey,
			tags
		});

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
