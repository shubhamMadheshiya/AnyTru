const express = require('express');
const router = express.Router();

// Bring in Models & Utils
const Cart = require('../models/cart');
const Product = require('../models/product');
const auth = require('../middleware/auth');
const store = require('../utils/store');
const Ads = require('../models/Ads');

router.post('/add', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const { adId, offerId } = req.body;
		const findAd = await Ads.findOne({ _id: adId });

		// Check if the vendor ID is included in the vendors array
		const offer = findAd.vendors.find((vendor) => vendor._id == offerId);

		// const isVendorIncluded = findAd.vendors.some((vendor) => vendor._id == vendorId);

		if (!offer) {
			return res.status(401).json({ error: 'This offer is not for this ad' });
		}

		console.log(findAd);
		console.log(offer);

		// const products = store.caculateItemsSalesTax(items);
		// console.log(products)

		const totalPrice = findAd.quantity * offer.pricePerProduct;

		const product = {
      offerId: offer._id,
			product: offer.product,
			address: offer.address,
			vendor: offer.vendor,
			quantity: findAd.quantity,
			pricePerProduct: offer.pricePerProduct,
			totalPrice,
			dispatchDay: offer.dispatchDay,
			remark: offer.remark
		};

		const findCart = await Cart.findOne({ user: userId });

		if (findCart) {
      if(findCart.products.some((product)=>product.offerId == offer._id)){
        return res.status(401).json({error:"This is already added to cart"})
      }
			findCart.products.push(product);
			await findCart.save();
			res.status(200).json({
			  success: true,
			  cartDoc: findCart
			});
		} else {
			const cart = new Cart({
				user: userId
			});

			cart.products.push(product);
			await cart.save();
			res.status(200).json({
			  success: true,
			  cartDoc: cart
			});
		}

		// const cartDoc = await cart.save();

		// decreaseQuantity(products);

		// res.status(200).json({
		//   success: true,
		//   cartId: cartDoc.id
		// });
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.delete('/delete/:cartId', auth, async (req, res) => {
	try {
		await Cart.deleteOne({ _id: req.params.cartId });

		res.status(200).json({
			success: true
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.post('/add/:cartId', auth, async (req, res) => {
	try {
		const product = req.body.product;
		const query = { _id: req.params.cartId };

		await Cart.updateOne(query, { $push: { products: product } }).exec();

		res.status(200).json({
			success: true
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

router.delete('/delete/:cartId/:productId', auth, async (req, res) => {
	try {
		const product = { product: req.params.productId };
		const query = { _id: req.params.cartId };

		await Cart.updateOne(query, { $pull: { products: product } }).exec();

		res.status(200).json({
			success: true
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

const decreaseQuantity = (products) => {
	let bulkOptions = products.map((item) => {
		return {
			updateOne: {
				filter: { _id: item.product },
				update: { $inc: { quantity: -item.quantity } }
			}
		};
	});

	Product.bulkWrite(bulkOptions);
};

module.exports = router;
