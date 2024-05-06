const mongoose = require('mongoose');
const { ROLES, EMAIL_PROVIDER } = require('../constants/index');

const userSchema = new mongoose.Schema({
	phoneNumber: {
		type: String
	},
	firstName: {
		type: String,
		required: true
	},
	lastName: {
		type: String
	},
	email: {
		type: String,
		required: () => {
			return this.provider !== 'email' ? false : true;
		},
		unique: true
	},
	userId: {
		type: String,
		required: true,
		unique: true
	},
	phoneNumber: {
		type: String
	},
	password: {
		type: String
	},
	bio: {
		type: String
	},
	provider: {
		type: String,
		required: true,
		default: EMAIL_PROVIDER.Email
	},
	googleId: {
		type: String
	},
	facebookId: {
		type: String
	},
	avatar: {
		type: String
	},
	role: {
		type: String,
		required: true,
		default: ROLES.User,
		enum: [ROLES.Admin, ROLES.User, ROLES.Merchant]
	},
	resetPasswordToken: { type: String },
	resetPasswordExpires: { type: Date },
	updated: Date,
	created: {
		type: Date,
		default: Date.now
	},
	address: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Address'
		}
	],
	followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
	cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cart' }],
	accountType: {
		type: String,
		enum: ['creater', 'seller'],
		default: 'creater'
	},
	rating: {
		type: Number,
		min: 1,
		max: 5,
		default: 1
	},
	vandorName: {
		type: String
	}
});

const User = mongoose.model('User', userSchema);

module.exports = User;
