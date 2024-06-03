// src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	title: { type: String },
	avatar: {
		type: String,
		default: 'https://as1.ftcdn.net/v2/jpg/03/46/83/96/1000_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg',
	},
	message: { type: String },
	imgUrl: { type: String },
	url: { type: String }, // Link to the relevant page or resource
	read: { type: Boolean, default: false },
	timestamp: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

// approve product
//like3s
//follow
//rating//
// ads bid
//order status
// message