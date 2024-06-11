// src/socket.js
const Message = require('./models/Message');
const NotificationService = require('./services/notificationService');
const User = require('./models/User');

const socketConfig = (io) => {
	io.on('connection', (socket) => {
		console.log('a user connected');

		socket.on('disconnect', () => {
			console.log('user disconnected');
		});

		socket.on('joinRoom', ({ userId, room }) => {
			socket.join(room);
			console.log(`${userId} joined room ${room}`);
			socket.emit("connected")
		});

		socket.on('chatMessage', async ({ sender, receiver, content }) => {
			const newMessage = new Message({
				sender,
				receiver,
				content
			});

			await newMessage.save();

			const notification = await NotificationService.createNotification(
				receiver,
				`New message from ${sender}`,
				`/chat/${sender}`
			);

			io.to(receiver).emit('message', {
				sender,
				content,
				timestamp: newMessage.timestamp
			});

			io.to(receiver).emit('notification', notification);
		});

		socket.on('getMessages', async ({ userId, contactId }) => {
			const messages = await Message.find({
				$or: [
					{ sender: userId, receiver: contactId },
					{ sender: contactId, receiver: userId }
				]
			}).sort({ timestamp: 1 });

			socket.emit('messages', messages);
		});

		socket.on('getNotifications', async ({ userId }) => {
			const notifications = await NotificationService.getNotifications(userId);
			socket.emit('notifications', notifications);
		});

		socket.on('markNotificationAsRead', async ({ notificationId }) => {
			await NotificationService.markAsRead(notificationId);
		});
	});
};

module.exports = socketConfig;
