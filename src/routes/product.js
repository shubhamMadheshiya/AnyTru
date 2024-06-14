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
		const userId = req.user?._id;

		// Check authentication and role
		const userDoc = await checkAuth(req);
		const isAdmin = userDoc?.role === ROLES.Admin;

		// Fetch the product using the slug
		const productDoc = await Product.findOne({ slug, isActive: true }, { imageKey: 0 })
			.populate('user', '_id firstName lastName userId role accountType isActive avatar')
			.lean(); // Use lean() for better performance and to return plain JavaScript objects

		// Check if the product exists and has an active user
		if (!productDoc || !productDoc.user || !productDoc.user.isActive) {
			return res.status(404).json({
				message: 'No product found.'
			});
		}

		// Calculate the number of likes
		const totalLikes = productDoc.likes.length;
		delete productDoc.likes; // Remove the likes array from the response

		// Check if the user liked the product
		const userLiked = userId ? productDoc.likes.includes(userId) : false;

		// Add totalLikes and userLiked to the product document in the response
		productDoc.totalLikes = totalLikes;
		productDoc.userLiked = userLiked;

		return res.status(200).json({
			product: productDoc
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// complete
// fetch product name search api
router.get('/list/search', async (req, res) => {
	const userDoc = await checkAuth(req);

	const userId = userDoc?.id;
	const isAdmin = userDoc?.role == ROLES.Admin;

	try {
		const { name, page = 1, limit = 10 } = req.query;
		const filter = { name: { $regex: new RegExp(name), $options: 'i' } };

		// If the user is not an admin, add isActive filter
		if (!isAdmin) {
			filter.isActive = true;
		}

		const skip = (page - 1) * limit;
		const projection = {
			_id: 1,
			sku: 1,
			imageUrl: 1,
			description: 1,
			user: 1,
			isActive: 1,
			category: 1,
			likes: 1
		};

		const products = await Product.find(filter, projection)
			.populate('user', '_id firstName lastName userId role isActive avatar createdAt')
			.sort('-createdAt')
			.skip(skip)
			.limit(limit)
			.exec();

		if (products.length === 0) {
			return res.status(404).json({
				message: 'No product found.'
			});
		}

		// Count documents with the given filters
		const count = await Product.countDocuments(filter);

		// Check if the authenticated user liked each product and get the total likes
		const productsWithLikes = products.map((product) => {
			const userLiked = product.likes.includes(userId);
			return {
				_id: product._id,
				sku: product.sku,
				imageUrl: product.imageUrl,
				description: product.description,
				user: product.user,
				isActive: product.isActive,
				category: product.category,
				totalLikes: product.likes.length,
				userLiked
			};
		});

		res.status(200).json({
			products: productsWithLikes,
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

// fetch products api of particular user by admin
router.get('/list', async (req, res) => {
	const { page = 1, limit = 10, likes, category, isActive = true } = req.query;
	let isAdmin;
	const userDoc = await checkAuth(req);
	
	const userId = userDoc?.id;

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

		// Find products with the given filters
		let productsQuery = Product.find(filter, { _id: 1, sku: 1, imageUrl: 1, description: 1, user: 1, isActive: 1, category: 1 })
			.populate('user', '_id firstName lastName userId role isActive avatar createdAt')
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

		// Check if the authenticated user liked each product and get the total likes
		const productsWithLikes = await Promise.all(
			products.map(async (product) => {
				const productLikesCount = await Product.aggregate([
					{ $match: { _id: product._id } },
					{ $project: { likesCount: { $size: '$likes' } } }
				]);
				const totalLikes = productLikesCount[0] ? productLikesCount[0].likesCount : 0;
				const userLiked = await Product.exists({ _id: product._id, likes: userId });

				

				return {
					_id: product._id,
					sku: product.sku,
					imageUrl: product.imageUrl,
					description: product.description,
					user: product.user,
					isActive: product.isActive,
					category: product.category,
					totalLikes,
					userLiked: !!userLiked
				};
			})
		);

		res.status(200).json({
			products: productsWithLikes,
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

		if (!name) {
			return res.status(400).json({ error: 'You must enter name.' });
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
		findUser.posts.push(savedProduct);
		findUser.save();

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

		// Construct the response object with the required fields
		const responseProduct = {
			_id: savedProduct._id,
			sku: savedProduct.sku,
			name: savedProduct.name,
			imageUrl: savedProduct.imageUrl,
			description: savedProduct.description,
			isActive: savedProduct.isActive,
			tags: savedProduct.tags,
			link: savedProduct.link,
			slug: savedProduct.slug,
			category: savedProduct.category
		};

		res.status(200).json({
			success: true,
			message: `Product has been added successfully!`,
			product: responseProduct
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
        // Fetch products for the authenticated user, excluding the likes array
        const products = await Product.find({ user: userId }, { imageKey: 0, likes: 0 })
            .sort('-createdAt')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        // Count total number of products
        const count = await Product.countDocuments({ user: userId });

        // Add totalLikes and userLiked fields to each product
        const productsWithLikes = await Promise.all(products.map(async (product) => {
            const productWithLikes = await Product.findById(product._id, 'likes').exec();
            const likes = productWithLikes.likes || []; // Ensure likes is an array
            const totalLikes = likes.length;
            const userLiked = likes.includes(userId);
            return {
                ...product._doc,
                totalLikes,
                userLiked
            };
        }));

        res.status(200).json({
            products: productsWithLikes,
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
		const userId = req.user?._id;

		// Check authentication and role
		const userDoc = await checkAuth(req);
		const isAdmin = userDoc?.role === ROLES.Admin;

		// Create filter based on user role
		const filter = { _id: productId };
		if (!isAdmin) {
			filter.isActive = true; // Non-admin users can only see active products
		}

		// Fetch the product and project the necessary fields
		const productDoc = await Product.findOne(filter, { imageKey: 0 })
			.populate('user', '_id firstName lastName userId role accountType isActive avatar')
			.lean(); // Use lean() for better performance and to return plain JavaScript objects

		if (!productDoc) {
			return res.status(404).json({
				error: 'No data found'
			});
		}

		// Calculate the number of likes
		const totalLikes = productDoc.likes.length;
		delete productDoc.likes; // Remove the likes array from the response

		// Check if the user liked the product
		const userLiked = userId ? productDoc.likes.includes(userId) : false;

		// Add totalLikes and userLiked to the product document
		productDoc.totalLikes = totalLikes;
		productDoc.userLiked = userLiked;

		return res.status(200).json({ productDoc });
	} catch (error) {
		console.error(error);
		res.status(500).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// completed

// Update product by Id (user and Admin)
router.put('/:id', auth, async (req, res) => {
	try {
		const productId = req.params.id;
		const userId = req.user._id;
		const userRole = req.user.role;
		const { sku, slug, description, tags, category, link } = req.body;

		// Find the product to check ownership
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({
				error: 'Product not found.'
			});
		}

		// Check if the requester is the owner of the product or an admin
		if (String(product.user) !== String(userId) && userRole !== ROLES.Admin) {
			return res.status(403).json({
				error: 'You do not have permission to update this product.'
			});
		}

		// Check if SKU or slug is already in use by another product
		const foundProduct = await Product.findOne({
			$or: [{ slug }, { sku }],
			_id: { $ne: productId } // Exclude the current product being updated
		});

		if (foundProduct) {
			return res.status(400).json({ error: 'SKU or slug is already in use.' });
		}

		// Filter the update object to allow only specific fields and non-empty values
		const updateFields = { sku, slug, description, tags, category, link };
		const allowedUpdates = {};
		Object.keys(updateFields).forEach((key) => {
			if (updateFields[key] !== undefined && updateFields[key].length > 0) {
				allowedUpdates[key] = updateFields[key];
			}
		});

		// Validate category if provided
		if (allowedUpdates.category) {
			const categoriesArray = Array.isArray(allowedUpdates.category)
				? allowedUpdates.category
				: allowedUpdates.category.split(',').map((cat) => cat.trim());
			for (const cat of categoriesArray) {
				if (!Object.values(CATEGORIES).includes(cat)) {
					return res.status(400).json({ error: `Invalid category: ${cat}` });
				}
			}
			allowedUpdates.category = categoriesArray; // Assign the validated array back to update
		}

		// Update the product
		const updatedProduct = await Product.findByIdAndUpdate(productId, allowedUpdates, {
			new: true
		});
		const data = {
			_id: updatedProduct._id,
			sku: updatedProduct.sku,
			name: updatedProduct.name,
			imageUrl: updatedProduct.imageUrl,
			description: updatedProduct.description,
			isActive: updatedProduct.isActive,
			tags: updatedProduct.tags,
			category: updatedProduct.category,
			link: updatedProduct.link,
			slug: updatedProduct.slug,
			createdAt: updatedProduct.createdAt
		};

		res.status(200).json({
			success: true,
			message: 'Product has been updated successfully!',
			product: data
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
		const userId = req.user._id;
		const userRole = req.user.role;
		const isActive = req.body.isActive; // Ensure isActive is defined

		if (isActive === undefined) {
			return res.status(400).json({ error: 'isActive field is missing in the request body.' });
		}

		// Find the product to check ownership
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({ error: 'Product not found.' });
		}

		// Check if the requester is the owner of the product or an admin
		if (String(product.user) !== String(userId) && userRole !== ROLES.Admin) {
			return res.status(403).json({ error: 'You do not have permission to update this product.' });
		}

		// Update the product's isActive status
		product.isActive = isActive;
		await product.save();

		// Create notification data
		const notificationData = {
			userId: product.user,
			title: product.name,
			message: `Your Product is now ${isActive ? 'Active' : 'Inactive'}`,
			url: `${ENDPOINT.Product}${product._id}`,
			imgUrl: product.imageUrl || ''
		};

		// Send notification
		const notification = await NotificationService.createNotification(notificationData);

		res.status(200).json({
			success: true,
			message: 'Product has been updated successfully!',
			isActive: product.isActive
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'An internal server error occurred. Please try again later.' });
	}
});


//completed
//delete product by Id (Admin & User)
router.delete('/delete/:id', auth, async (req, res) => {
	try {
		const productId = req.params.id;
		const userId = req.user._id;
		const userRole = req.user.role;

		// Find the product to get the user ID before deletion
		const product = await Product.findById(productId);
		if (!product) {
			return res.status(404).json({
				error: 'Product not found.'
			});
		}

		// Check if the requester is the owner of the product or an admin
		if (String(product.user) !== String(userId) && userRole !== ROLES.Admin) {
			return res.status(403).json({
				error: 'You do not have permission to delete this product.'
			});
		}

		// Delete the product
		await Product.deleteOne({ _id: productId });

		// Remove the product from the user's posts array
		await User.updateOne({ _id: product.user }, { $pull: { posts: productId } });

		res.status(200).json({
			success: true,
			message: `Product has been deleted successfully!`
		});
	} catch (error) {
		console.error(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.put('/like/:productId', auth, async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user._id;

		const product = await Product.findById(productId);
		const findUser = await User.findById(userId);

		if (!findUser) {
			res.status(404).json({ error: 'User not found' });
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
				avatar: findUser.avatar || '',
				message: `liked your post`,
				url: `${ENDPOINT.Product}${product._id}`,
				imgUrl: product.imageUrl || ''
			};
			console.log(notificationData);
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

router.get('/likeslist/:productId', auth, async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user._id;

		// Find the product
		const product = await Product.findOne({_id:productId, isActive: true}).populate('likes', '_id userId firstName lastName avatar');

		if (!product) {
			return res.status(404).json({
				error: 'Product not found.'
			});
		}

		// Get the list of users who liked the product
		const usersWhoLiked = product.likes;

		// Check if the request user is following each user who liked the product
		const usersWithFollowStatus = await Promise.all(
			usersWhoLiked.map(async (user) => {
				// Check if the request user is following this user
				const isFollowing = await User.exists({ _id: userId, following: user._id });
				return {
					_id: user._id,
					userId: user.userId,
					firstName: user.firstName,
					lastName: user.lastName,
					avatar: user.avatar,
					isFollowing: isFollowing?true:false,
				};
			})
		);

		res.status(200).json({
			success: true,
			usersWhoLiked: usersWithFollowStatus
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
