// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NotificationService = require('../services/notificationService');


//get all notification
router.get('/', auth, async (req, res) => {
	const userId = req.user._id;
	const notifications = await NotificationService.getNotifications(userId)
	res.json({notifications});
});

// mark read notification
router.post('/:id/read', auth, async (req, res) => {
	const notificationId = req.params.id;
	await NotificationService.markAsRead(notificationId);
	res.json({ success: true });
});


module.exports = router;
