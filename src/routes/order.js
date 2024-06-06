const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Bring in Models & Utils
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mailgun = require('../services/mailgun');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const keys = require('../config/keys');
const role = require('../middleware/role');
const NotificationService = require('../services/notificationService');
const { ROLES, ORDER_ITEM_STATUS, ORDER_PAYMENT_STATUS, ENDPOINT } = require('../constants');
const razorpayInstance = require('../services/razorPay');
const Ads = require('../models/Ads');

// Checkout single order route
router.post('/checkoutSingle', auth, async (req, res) => {
	const { adId, offerId } = req.body;
	const userId = req.user._id;

	if (!adId || !offerId) {
		return res.status(404).json({ error: ' please provide adId and offerId' });
	}
	try {
		const findOffer = await Ads.findOne({ _id: adId, user: userId, 'offers._id': offerId })
			.populate('address')
			.populate('product');

		// console.log(findOffer);
		if (!findOffer) {
			return res.status(404).json({ error: 'Ad not found' });
		}

		acceptedOffer = findOffer.offers.find((offer) => (offer._id = offerId));
		totalPrice = acceptedOffer.pricePerProduct * findOffer.quantity;

		const options = {
			amount: totalPrice * 100,
			currency: 'INR',
			receipt: `receipt_${Date.now()}`,
			payment_capture: 1
		};
		const order = await razorpayInstance.orders.create(options);
		if (!order) {
			return res.status(400).json({ error: 'Order not found' });
		}
		// console.log(order);

		const orderData = {
			orderId: order.id,
			user: findOffer.user,
			PaymentStatus: ORDER_PAYMENT_STATUS.Created,
			product: findOffer.product,
			quantity: findOffer.quantity,
			vendor: acceptedOffer.vendor,
			pricePerProduct: acceptedOffer.pricePerProduct,
			totalAmount: order.amount/100,
			remark: acceptedOffer.remark,
			dispatchDay: acceptedOffer.dispatchDay,
			address: findOffer.address,
			receipt: order.receipt
		};

		const newOrder = new Order(orderData);
		const orderDoc = await newOrder.save();
		// await Cart.deleteOne({ _id: cartId });

		// // send vendor Notification
		// //add ads acceptedOffer
		// await mailgun.sendEmail(user.email, 'order-confirmation', orderDoc);

		res.status(200).json({
			success: true,
			message: 'Your order has been created successfully!',
			orderDoc,
			order
		});
	} catch (error) {
		console.error(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// // Checkout route
// router.post('/checkout/:cartId', auth, async (req, res) => {
// 	try {
// 		const cartId = req.params.cartId;
// 		const userId = req.user._id;

// 		const cart = await Cart.findById(cartId).populate('products.address').populate('products.product');
// 		if (!cart) {
// 			return res.status(400).json({ error: 'Cart not found' });
// 		}

// 		const user = await User.findById(userId);
// 		if (!user) {
// 			return res.status(400).json({ error: 'User not found' });
// 		}

// 		if (!cart.user.equals(userId)) {
// 			return res.status(401).json({ error: 'Cart does not belong to you' });
// 		}

// 		const options = {
// 			amount: cart.overAllPrice * 100,
// 			currency: 'INR',
// 			receipt: `receipt_${Date.now()}`,
// 			payment_capture: 1
// 		};
// 		const order = await razorpayInstance.orders.create(options);
// 		if (!order) {
// 			return res.status(400).json({ error: 'Order not found' });
// 		}

// 		const orderData = {
// 			orderId: order.id,
// 			user: user._id,
// 			amount: order.amount,
// 			status: ORDER_PAYMENT_STATUS.Created,
// 			receipt: order.receipt,
// 			products: cart.products
// 		};

// 		const newOrder = new Order(orderData);

// 		const orderDoc = await newOrder.save();
// 		await Cart.deleteOne({ _id: cartId });

// 		// send vendor Notification
// 		//add ads acceptedOffer
// 		await mailgun.sendEmail(user.email, 'order-confirmation', orderDoc);

// 		res.status(200).json({
// 			success: true,
// 			message: 'Your order has been created successfully!',
// 			orderDoc
// 		});
// 	} catch (error) {
// 		console.error(error);
// 		res.status(400).json({
// 			error: 'Your request could not be processed. Please try again.'
// 		});
// 	}
// });
// add get by user
//vendor
// Payment verification route
router.post('/verificationPay', async (req, res) => {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

		console.log("verification")

		const order = await Order.findOne({ orderId: razorpay_order_id }).populate('vendor', 'user');
		if (!order) {
			return res.status(404).json({ error: 'Order not found' });
		}

		const body = razorpay_order_id + '|' + razorpay_payment_id;
		const expectedSignature = crypto.createHmac('sha256', keys.razorpay.secretAccessKey).update(body.toString()).digest('hex');

		const isAuthentic = expectedSignature === razorpay_signature;

		if (isAuthentic) {
			order.paymentId = razorpay_payment_id;
			order.paymentSignature = razorpay_signature;
			order.status = ORDER_PAYMENT_STATUS.Captured;

			order.products.map(async (singleOrder) => {
				const notificationData = {
					userId: singleOrder.vendor.user, // review
					title: singleOrder.product.name,
					avatar: singleOrder.product.imageUrl,
					message: `Your offer is accepted by ${order.user}`,
					url: `${ENDPOINT.Order}${order.orderId}`
				};
				const notification = await NotificationService.createNotification(notificationData);
			});
			await mailgun.sendEmail(user.email, 'order-confirmation', orderDoc);
			// mail of vendor
		} else {
			order.status = ORDER_PAYMENT_STATUS.Failed;
		}

		await order.save();

		res.status(isAuthentic ? 200 : 400).json({
			success: isAuthentic,
			message: isAuthentic ? `Order status updated to ${order.status}` : 'Invalid signature',
			order
		});
	} catch (error) {
		console.error('Error during payment verification:', error);
		res.status(500).json({
			error: 'Internal Server Error'
		});
	}
});

// Payment refund route
router.post('/refund/:singleOrderId', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const singleOrderId = req.params.singleOrderId;
		const paymentId = req.body.paymentId;
		const findOrder = await Order.findOne({ 'products._id': singleOrderId, paymentId });

		if (!findOrder) {
			return res.status(404).json({ error: 'No single order found' });
		}

		if (!findOrder.status == ORDER_PAYMENT_STATUS.Captured) {
			return res.status(403).json({ error: 'Yet user have not done Payment' });
		}

		if (findOrder.refundOrder == singleOrderId) {
			return res.status(403).json({ error: 'Already refunded' });
		}

		const singleOrder = findOrder.products.find((product) => product._id.equals(singleOrderId));
		if (!singleOrder) {
			return res.status(404).json({ error: 'Product not found in the order' });
		}

		const amount = singleOrder.totalPrice;

		const options = {
			payment_id: paymentId,
			amount: amount * 100,
			receipt: `receipt_${Date.now()}`
		};

		const razorpayResponse = await razorpayInstance.payments.refund(options);

		findOrder.refundOrder.push(singleOrder._id);
		findOrder.status = ORDER_PAYMENT_STATUS.Refunded;
		await findOrder.save();

		res.status(201).json({
			message: 'Refund initiated',
			razorpayResponse
		});
	} catch (error) {
		console.error('Error during refund:', error);
		res.status(400).json({
			error: 'Unable to issue a refund. Please try again.'
		});
	}
});

// Search orders API
router.get('/search', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const { search } = req.query;

		if (!search) {
			return res.status(400).json({ error: 'Search query is required.' });
		}

		const order = await Order.findOne(
			{ orderId: search.toString() },
			{ refundOrder: 0, _id: 0, receipt: 0, paymentSignature: 0, paymentId: 0 }
		)
			.sort('-createdAt')
			.populate({ path: 'user', select: 'name email avatar _id' });

		if (!order) {
			return res.status(404).json({ error: `No order found with orderId ${search}` });
		}

		res.status(200).json({ order });
	} catch (error) {
		console.error('Error fetching order:', error);
		res.status(500).json({
			error: 'Your request could not be processed. Please try again later.'
		});
	}
});

// fetch orders api vendor
router.get('/vendor/:vendorId', auth, async (req, res) => {
	const vendorId = req.params.vendorId;
	try {
		const { page = 1, limit = 10 } = req.query;
		const ordersDoc = await Order.find()
			.sort('-createdAt')
			.populate({
				path: 'products',
				match: { vendor: vendorId },
				populate: {
					path: 'vendor',
					select: '_id name , email',
					populate: {
						path: 'user',
						select: 'email avatar'
					}
				}
			})
			.populate({ path: 'user', select: 'name email avatar _id' })
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

		const count = await Order.countDocuments();
		// const orders = store.formatOrders(ordersDoc);

		if (!ordersDoc) {
			return res.status(404).json({ error: 'No any order found' });
		}

		res.status(200).json({
			// orders,
			ordersDoc,
			totalPages: Math.ceil(count / limit),
			currentPage: Number(page),
			count
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch orders api
router.get('/user/:userId', auth, async (req, res) => {
	const userId = req.params.userId;
	try {
		const { page = 1, limit = 10 } = req.query;
		const ordersDoc = await Order.find({ user: userId })
			.sort('-createdAt')
			.populate({
				path: 'products',
				populate: {
					path: 'vendor',
					select: '_id name , email',
					populate: {
						path: 'user',
						select: 'email avatar'
					}
				}
			})
			.populate({ path: 'user', select: 'name email avatar _id' })
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

		const count = await Order.countDocuments();
		// const orders = store.formatOrders(ordersDoc);

		if (!ordersDoc) {
			return res.status(404).json({ error: 'No any order found' });
		}

		res.status(200).json({
			// orders,
			ordersDoc,
			totalPages: Math.ceil(count / limit),
			currentPage: Number(page),
			count
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch orders api by admin
router.get('/', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const { page = 1, limit = 10 } = req.query;
		const ordersDoc = await Order.find()
			.sort('-createdAt')
			.populate({
				path: 'products',
				populate: {
					path: 'vendor',
					select: '_id name , email',
					populate: {
						path: 'user',
						select: 'email avatar'
					}
				}
			})
			.populate({ path: 'user', select: 'name email avatar _id' })
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

		const count = await Order.countDocuments();
		// const orders = store.formatOrders(ordersDoc);

		res.status(200).json({
			// orders,
			ordersDoc,
			totalPages: Math.ceil(count / limit),
			currentPage: Number(page),
			count
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch order api by orderId
router.get('/:orderId', auth, async (req, res) => {
	try {
		const orderId = req.params.orderId;

		let orderDoc = null;

		if (req.user.role === ROLES.Admin) {
			orderDoc = await Order.findOne({ orderId: orderId.toString() })
				.populate({
					path: 'products',
					populate: {
						path: 'vendor',
						select: '_id name , email',
						populate: {
							path: 'user',
							select: 'email avatar'
						}
					}
				})
				.populate({ path: 'user', select: 'name email avatar _id' });
		} else {
			const user = req.user._id;
			orderDoc = await Order.findOne({ orderId, user })
				.populate({
					path: 'products',
					populate: {
						path: 'vendor',
						select: '_id name , email',
						populate: {
							path: 'user',
							select: 'email avatar'
						}
					}
				})
				.populate({ path: 'user', select: 'name email avatar _id' });
		}

		if (!orderDoc) {
			return res.status(404).json({
				message: `Cannot find order with the id: ${orderId}.`
			});
		}

		// let order = {
		// 	_id: orderDoc._id,
		// 	total: orderDoc.total,
		// 	created: orderDoc.created,
		// 	totalTax: 0,
		// 	products: orderDoc?.cart?.products,
		// 	cartId: orderDoc.cart._id
		// };

		// order = store.caculateTaxAmount(order);

		res.status(200).json({
			orderDoc
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// Cancel single order item API
router.delete('/cancel/item', auth, role.check(ROLES.Admin), async (req, res) => {
	const { orderId, singleOrderId } = req.body;

	try {
		const findOrder = await Order.findOne({ 'products._id': singleOrderId, orderId });

		if (!findOrder) {
			return res.status(404).json({ error: 'No single order found' });
		}

		const singleOrder = findOrder.products.find((singleOrder) => singleOrder._id == singleOrderId);

		if (!singleOrder) {
			return res.status(404).json({ error: 'No single order found' });
		}

		if (singleOrder.status == ORDER_ITEM_STATUS.Processing) {
			return res.status(403).json({ error: `Order is already ${ORDER_ITEM_STATUS.Processing}` });
		}
		if (singleOrder.status == ORDER_ITEM_STATUS.Shipped) {
			return res.status(403).json({ error: `Order is already ${ORDER_ITEM_STATUS.Shipped}` });
		}
		if (singleOrder.status == ORDER_ITEM_STATUS.Delivered) {
			return res.status(403).json({ error: `Order is already ${ORDER_ITEM_STATUS.Delivered}` });
		}
		if (singleOrder.status == ORDER_ITEM_STATUS.Cancelled) {
			return res.status(403).json({ error: `Order is already ${ORDER_ITEM_STATUS.Cancelled}` });
		}

		singleOrder.status = ORDER_ITEM_STATUS.Cancelled;

		const updatedOrder = await findOrder.save();

		res.status(200).json({
			updatedOrder,
			success: true,
			message: 'Order has been cancelled successfully'
		});
	} catch (error) {
		console.error('Error cancelling the order:', error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// Update status of a single order item
router.put('/status/item', auth, role.check(ROLES.Admin, ROLES.Merchant), async (req, res) => {
	try {
		const { orderId, singleOrderId, status } = req.body;
		const findOrder = await Order.findOne({ 'products._id': singleOrderId, orderId });

		if (!findOrder) {
			return res.status(404).json({ error: 'No order found' });
		}

		const singleOrder = findOrder.products.id(singleOrderId);

		if (!singleOrder) {
			return res.status(404).json({ error: 'No single order item found' });
		}

		if (!Object.values(ORDER_ITEM_STATUS).includes(status)) {
			return res.status(400).json({ error: `Invalid status: ${status}. Please select a valid status.` });
		}

		// Validate the new status transition
		const currentStatus = singleOrder.status;
		if (currentStatus === ORDER_ITEM_STATUS.Cancelled) {
			return res.status(403).json({ error: 'Cannot update status of a cancelled order.' });
		}

		const validStatusTransitions = {
			[ORDER_ITEM_STATUS.Not_processed]: [ORDER_ITEM_STATUS.Processing, ORDER_ITEM_STATUS.Cancelled],
			[ORDER_ITEM_STATUS.Processing]: [ORDER_ITEM_STATUS.Shipped, ORDER_ITEM_STATUS.Cancelled],
			[ORDER_ITEM_STATUS.Shipped]: [ORDER_ITEM_STATUS.Delivered, ORDER_ITEM_STATUS.Cancelled],
			[ORDER_ITEM_STATUS.Delivered]: [],
			[ORDER_ITEM_STATUS.Cancelled]: []
		};

		if (!validStatusTransitions[currentStatus].includes(status)) {
			return res.status(403).json({
				error: `Invalid status transition from ${currentStatus} to ${status}.`
			});
		}

		singleOrder.status = status;

		await findOrder.save();

		const notificationData = {
			userId: findOrder.user, // review
			title: singleOrder.product.name,
			avatar: singleOrder.product.imageUrl,
			message: `Your offer is being ${singleOrder.status}`,
			url: `${ENDPOINT.Order}${findOrder.orderId}`
		};
		const notification = await NotificationService.createNotification(notificationData);

		res.status(200).json({
			success: true,
			message: 'Item status has been updated successfully!',
			order: findOrder
		});
	} catch (error) {
		console.error('Error updating order item status:', error);
		res.status(500).json({
			error: 'An error occurred while processing your request. Please try again.'
		});
	}
});

module.exports = router;
