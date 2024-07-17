const mongoose = require('mongoose');
const { ROLES, EMAIL_PROVIDER,ACCOUNTS } = require('../constants/index');
const wishlist = require('./wishlist');


const userSchema = new mongoose.Schema({
	firstName: {
		type: String,
		required: true,
		trim: true
	},
	lastName: {
		type: String,
		trim: true
	},
	email: {
		type: String,
		required: () => {
			return this.provider !== 'email' ? false : true;
		},
		unique: true,
		trim: true
	},
	userId: {
		type: String,
		trim: true
	},
	phoneNumber: {
		type: String,
		trim: true
	},
	password: {
		type: String,
		trim: true
	},
	bio: {
		type: String,
		trim: true
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
	avatarKey: {
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
	posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

	accountType: {
		type: String,
		enum: [ACCOUNTS.Creator, ACCOUNTS.Personal],
		default: ACCOUNTS.Personal
	},
	merchantReq: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'merchant',
		default: null
	},
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor',
		default: null
	},
	vandorName: {
		type: String
	},
	isActive: {
		type: Boolean,
		default: true
	},
	wishlist: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'wishlist'
	},
	reports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }]
});



// // Generate a unique userId based on firstName and lastName
// userSchema.pre('save', function (next) {
//   if (this.isNew || this.isModified('firstName') || this.isModified('lastName')) {
//     this.userId = `${this.firstName.toLowerCase()}_${this.lastName.toLowerCase()}_${Math.floor(1000 + Math.random() * 9000)}`;
//   }
//   next();
// });

const User = mongoose.model('User', userSchema);

module.exports = User;
