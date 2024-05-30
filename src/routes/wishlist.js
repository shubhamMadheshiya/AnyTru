const express = require('express');
const router = express.Router();

// Bring in Models & Helpers
const Wishlist = require('../models/wishlist');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const User = require('../models/User');

router.post('/add/:productId', auth, async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user._id;

		const findProduct = await Product.findOne({ _id: productId, isActive: true });
		const findUser = await User.findOne({ _id: userId, isActive: true });

		if (!findProduct) {
			return res.status(404).json({ error: 'Product not found' });
		}
		if (!findUser) {
			return res.status(404).json({ error: 'User not found' });
		}

		let wishlist = await Wishlist.findOne({ user: userId });

		if (wishlist) {
			if (!wishlist.product.includes(productId)) {
				wishlist.product.push(productId);
				wishlist.updated = Date.now();
				await wishlist.save();
				res.status(200).json({
					success: true,
					message: 'Your Wishlist has been updated successfully!',
					wishlist
				});
			} else {
				res.status(200).json({
					success: true,
					message: 'Product is already in your Wishlist!',
					wishlist
				});
			}
		} else {
			wishlist = new Wishlist({
				user: userId,
				product: [productId]
			});
			await wishlist.save();
			res.status(200).json({
				success: true,
				message: 'Added to your Wishlist successfully!',
				wishlist
			});
		}
	} catch (error) {
		console.error(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch wishlist api
router.get('/', auth, async (req, res) => {
	try {
		const user = req.user._id;

		const wishlist = await Wishlist.find({ user })
			.populate({
				path: 'product',
				select: 'name slug price imageUrl'
			})
			.sort('-updated');

		res.status(200).json({
			wishlist
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// Remove product from wishlist
router.delete('/remove/:productId', auth, async (req, res) => {
	try {
		const { productId } = req.params;
		const userId = req.user._id;

		const foundProduct = await Wishlist.findOne({ user: userId, product: productId });
		if (!foundProduct) {
			return res.status(404).json({
				success: false,
				message: 'Product not found in your Wishlist!'
			});
		}

		foundProduct.product.pull(productId);
		foundProduct.updated = Date.now();
		await foundProduct.save();
		return res.status(200).json({
			success: true,
			message: 'Product has been removed from your Wishlist!',
		});
	} catch (error) {
		console.error(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

module.exports = router;
