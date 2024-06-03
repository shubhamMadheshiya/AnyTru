// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const { ORDER_ITEM_STATUS, ORDER_PAYMENT_STATUS } = require('../constants');

// Create a new chat 
router.post('/singleOrderId', auth, async (req, res) => {

    const singleOrderId = req.params.singleOrderId;
    const findOrder = await Order.findOne({
			products: { $elemMatch: { _id: singleOrderId, status: ORDER_ITEM_STATUS.Processing } }
		});
		console.log(findOrder)

	// if(!findOrder){
	// 	res.status(404).json({error:'Order not found'})
	// }
	// const { chatName, users, order } = req.body;

	// if (!users || users.length === 0) {
	// 	return res.status(400).send({ message: 'Users are required to create a chat' });
	// }

	// try {
	// 	const newChat = new Chat({
	// 		chatName,
	// 		users,
	// 		order
	// 	});

	// 	const savedChat = await newChat.save();
	// 	res.status(201).json(savedChat);
	// } catch (error) {
	// 	res.status(500).send({ message: 'Error creating chat', error: error.message });
	// }
});

// Fetch chats for a user
router.get('/', auth, async (req, res) => {
	try {
		const userId = req.user._id;
		const chats = await Chat.find({ users: userId })
			.populate('users', '-password') // Populate users but exclude password field
			.populate('latestMessage')
			.populate({
				path: 'latestMessage',
				populate: {
					path: 'sender',
					select: 'name email'
				}
			})
			.populate('order');

		res.status(200).json(chats);
	} catch (error) {
		res.status(500).send({ message: 'Error fetching chats', error: error.message });
	}
});

// Update chat (e.g., change chat name, add/remove users)
router.put('/:chatId', auth, async (req, res) => {
	const { chatId } = req.params;
	const { chatName, users, latestMessage } = req.body;

	try {
		const updatedChat = await Chat.findByIdAndUpdate(
			chatId,
			{
				chatName,
				users,
				latestMessage
			},
			{ new: true }
		)
			.populate('users', '-password')
			.populate('latestMessage')
			.populate({
				path: 'latestMessage',
				populate: {
					path: 'sender',
					select: 'name email'
				}
			})
			.populate('order');

		if (!updatedChat) {
			return res.status(404).send({ message: 'Chat not found' });
		}

		res.status(200).json(updatedChat);
	} catch (error) {
		res.status(500).send({ message: 'Error updating chat', error: error.message });
	}
});

module.exports = router;
