const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat')
const Message = require('../models/Message')
const auth = require('../middleware/auth');


// Get messages by chat id with pagination
router.get('/:chatId', auth, async (req, res) => {
	try {
		const { chatId } = req.params;
		const { page = 1, limit = 20 } = req.query; // Default to page 1 and limit 20 messages


        const query = {
					chat: chatId,
                    'chat.users': req.user._id
				};
                console.log(query)
		// Convert page and limit to integers
		const pageInt = parseInt(page);
		const limitInt = parseInt(limit);

		// Get total count of messages for the chat
		const count = await Message.countDocuments(query);

		// Fetch messages with pagination
		const messages = await Message.find(query)
			.sort({ createdAt: -1 }) // Sort messages by creation date (newest first)
			.skip((pageInt - 1) * limitInt)
			.limit(limitInt)
			.populate('sender', 'firstName lastName userId avatar')
			.populate({
				path: 'chat',
				populate: {
					path: 'users',
					select: 'userId avatar firstName lastName'
				},
				select: 'users'
			});

		if (!messages || messages.length === 0) {
			return res.status(404).json({ error: 'No messages found for this chat' });
		}

		// Fetch only unread messages to update their status
		const unreadMessages = await Message.find({ chat: chatId, read: false });

		// Update read status for each unread message
		const updatePromises = unreadMessages.map(message => {
			message.read = true;
			return message.save();
		});
		await Promise.all(updatePromises);

		// Calculate total pages
		const totalPages = Math.ceil(count / limitInt);

		res.status(200).json({
			messages,
			totalPages,
			currentPage: pageInt,
			count
		});
	} catch (error) {
		console.error('Error fetching messages:', error);
		res.status(500).json({ error: 'An error occurred while fetching messages' });
	}
});



// Send message
router.post('/:chatId', auth, async (req, res) => {
	const { chatId } = req.params;
	const { content } = req.body;

	// Validate request data
	if (!content || !chatId) {
		return res.status(400).json({ error: 'Invalid data passed into request' });
	}

	const newMessage = {
		sender: req.user._id,
		content: content,
		chat: chatId
	};

	try {
		// Create new message
		let message = await Message.create(newMessage);

		// Populate necessary fields for the newly created message
		message = await Message.findById(message._id)
			.populate('sender', 'firstName lastName userId avatar')
			.populate({
				path: 'chat',
				populate: {
					path: 'users',
					select: 'userId avatar firstName lastName'
				},
				select: 'users'
			});

		// Update latestMessage in chat
		await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

		res.status(201).json({ success: true, message });
	} catch (error) {
		console.error('Error sending message:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});


module.exports = router;
