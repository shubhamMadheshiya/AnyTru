// src/services/notificationService.js
const Notification = require('../models/Notification');

const createNotification = async (notificationData) => {
	const notification = new Notification({
		user: notificationData.userId,
		title: notificationData.title,
		avatar: notificationData.avatar,
		message: notificationData.message,
		url: notificationData.url,
		imgUrl: notificationData.imgUrl,
	});

	await notification.save();
	return notification;
};

const getNotifications = async (userId) => {
	return await Notification.find({ user: userId }).sort({ timestamp: -1 });
};

const markAsRead = async (notificationId) => {
	const notification = await Notification.findById(notificationId);
	if (notification) {
		notification.read = true;
		await notification.save();
	}
	return notification;
};

module.exports = {
	createNotification,
	getNotifications,
	markAsRead
};
