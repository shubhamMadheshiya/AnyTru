// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const { ORDER_ITEM_STATUS, ORDER_PAYMENT_STATUS } = require('../constants');

// Create a new chat or get chat of created user
router.post('/:orderId', auth, async (req, res) => {
	const orderId = req.params.orderId;
	const findOrder = await Order.findOne({
		orderId,
		paymentStatus: ORDER_PAYMENT_STATUS.Captured,
		user: req.user
		// products: { $elemMatch: { _id: singleOrderId, status: ORDER_ITEM_STATUS.Processing } }
	}).populate('vendor');
console.log(findOrder)
	if (!findOrder) {
		return res.status(404).json({ error: 'Order not found' });
	}

	const findChat = await Chat.findOne({orderId})

	if (!findChat) {
			try {
				const newChat = new Chat({
					orderId
				});
				newChat.users.push(findOrder.user, findOrder.vendor.user);

				const savedChat = await newChat.save();
				res.status(201).json({ chat: savedChat });
			} catch (error) {
				res.status(500).send({ error: 'Error creating chat' });
			}
		
	}else{
		res.status(200).json({chat:findChat})

	}


});

// Fetch chats for a user
router.get('/', auth, async (req, res) => {
	
	try {
		const user = req.user;
		const chats = await Chat.find({ users: user })
			.populate('users', '_id firstName lastName email userId role accountType isActive avatar phoneNumber') // Populate users but exclude password field
			.populate('latestMessage')
			.populate({
				path: 'latestMessage',
				populate: {
					path: 'sender',
					select: 'firstName lastName userId avatar'
				},
				select: 'sender content read createdAt'
			});
			

		res.status(200).json(chats);
	} catch (error) {
		res.status(500).send({ message: 'Error fetching chats', error: error.message });
	}
});

// // Update chat (e.g., change chat name, add/remove users)
// router.put('/:chatId', auth, async (req, res) => {
// 	const { chatId } = req.params;
// 	const { chatName, users, latestMessage } = req.body;

// 	try {
// 		const updatedChat = await Chat.findByIdAndUpdate(
// 			chatId,
// 			{
// 				chatName,
// 				users,
// 				latestMessage
// 			},
// 			{ new: true }
// 		)
// 			.populate('users', '-password')
// 			.populate('latestMessage')
// 			.populate({
// 				path: 'latestMessage',
// 				populate: {
// 					path: 'sender',
// 					select: 'name email'
// 				}
// 			})
// 			.populate('order');

// 		if (!updatedChat) {
// 			return res.status(404).send({ message: 'Chat not found' });
// 		}

// 		res.status(200).json(updatedChat);
// 	} catch (error) {
// 		res.status(500).send({ message: 'Error updating chat', error: error.message });
// 	}
// });

module.exports = router;
