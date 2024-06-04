const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const Ads = require('../models/Ads');

// Add item to cart
router.post('/add', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const { adId, offerId } = req.body;
		const findAd = await Ads.findOne({ _id: adId });

		if (!findAd) {
			return res.status(404).json({ error: 'Ad not found' });
		}

		const offer = findAd.offers.find((offer) => offer._id.toString() === offerId);

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
			if (cart.products.some((product) => product.offerId.toString() === offer._id.toString())) {
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
			message: 'Added to cart successfully',
			// cartDoc: cart
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

		const productIndex = cart.products.findIndex((product) => product._id.toString() === productId);

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

// Get all cart items for a user
router.get('/:userId', auth, async (req, res) => {
	try {
		const userId = req.params.userId;
		const cart = await Cart.findOne({ user: userId })
			.populate('products.product', '-imageKey -description -user -likes -createdAt -updatedAt -slug -link')
			.populate('products.address', '-created')
			.populate('products.vendor', '-merchantAddress -merchantDoc -websiteUrl -ads -rejAds -created -description');

		if (!cart) {
			return res.status(404).json({ error: 'Cart not found' });
		}

		res.status(200).json({
			success: true,
			products: cart.products,
			overAllPrice: cart.overAllPrice
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
