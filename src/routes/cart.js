const express = require('express');
const router = express.Router();

// Bring in Models & Utils
const Cart = require('../models/cart');
const Product = require('../models/Product')
const auth = require('../middleware/auth');
const store = require('../utils/store');
const Ads = require('../models/Ads');

router.post('/add', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const { adId, offerId } = req.body;
		const findAd = await Ads.findOne({ _id: adId });
		console.log('findAd', findAd);

		// Check if the vendor ID is included in the vendors array
		const offer = findAd.vendors.find((vendor) => vendor._id == offerId);

		if (!offer) {
			return res.status(401).json({ error: 'This offer is not for this ad' });
		}

		const totalPrice = findAd.quantity * offer.pricePerProduct;

		const product = {
			offerId: offer._id,
			product: findAd.product,
			address: findAd.address,
			vendor: offer.vendor,
			quantity: findAd.quantity,
			pricePerProduct: offer.pricePerProduct,
			totalPrice,
			dispatchDay: offer.dispatchDay,
			remark: offer.remark
		};

		let cart = await Cart.findOne({ user: userId });

		if (cart) {
			if (cart.products.some((product) => product.offerId == offer._id)) {
				return res.status(401).json({ error: 'This offer is already added to the cart' });
			}
			cart.products.push(product);
		} else {
			cart = new Cart({
				user: userId,
				products: [product]
			});
		}

		// Calculate the overAllPrice
		const overAllPrice = cart.products.reduce((total, product) => total + product.totalPrice, 0);
		cart.overAllPrice = overAllPrice;

		await cart.save();

		res.status(200).json({
			success: true,
			cartDoc: cart
		});
	} catch (error) {
		console.error(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});
// Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const productId = req.params.productId;

		const cart = await Cart.findOne({ user: userId });

		if (!cart) {
			return res.status(404).json({ error: 'Cart not found' });
		}

		const productIndex = cart.products.findIndex((product) => product._id == productId);

		if (productIndex === -1) {
			return res.status(404).json({ error: 'Product not found in cart' });
		}

		// Get the price of the product being removed and subtract it from overAllPrice
		const removedProductPrice = cart.products[productIndex].totalPrice;
		cart.overAllPrice -= removedProductPrice;

		// Remove the product from the cart
		cart.products.splice(productIndex, 1);

		await cart.save();

		res.json({ success: true, message: 'Product removed from cart successfully', cart });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// router.delete('/delete/:cartId', auth, async (req, res) => {
// 	try {
// 		await Cart.deleteOne({ _id: req.params.cartId });

// 		res.status(200).json({
// 			success: true
// 		});
// 	} catch (error) {
// 		res.status(400).json({
// 			error: 'Your request could not be processed. Please try again.'
// 		});
// 	}
// });

// router.post('/add/:cartId', auth, async (req, res) => {
// 	try {
// 		const product = req.body.product;
// 		const query = { _id: req.params.cartId };

// 		await Cart.updateOne(query, { $push: { products: product } }).exec();

// 		res.status(200).json({
// 			success: true
// 		});
// 	} catch (error) {
// 		res.status(400).json({
// 			error: 'Your request could not be processed. Please try again.'
// 		});
// 	}
// });

// router.delete('/delete/:cartId/:productId', auth, async (req, res) => {
// 	try {
// 		const product = { product: req.params.productId };
// 		const query = { _id: req.params.cartId };

// 		await Cart.updateOne(query, { $pull: { products: product } }).exec();

// 		res.status(200).json({
// 			success: true
// 		});
// 	} catch (error) {
// 		res.status(400).json({
// 			error: 'Your request could not be processed. Please try again.'
// 		});
// 	}
// });

// const decreaseQuantity = (products) => {
// 	let bulkOptions = products.map((item) => {
// 		return {
// 			updateOne: {
// 				filter: { _id: item.product },
// 				update: { $inc: { quantity: -item.quantity } }
// 			}
// 		};
// 	});

// 	Product.bulkWrite(bulkOptions);
// };

module.exports = router;
