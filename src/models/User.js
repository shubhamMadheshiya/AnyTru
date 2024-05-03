const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
	name: {
		firstName: {
			type: String,
			required: true
		},
		lastName: {
			type: String
		}
	},

	email: {
		type: String,
		required: true,
		unique: true
	},
	userId: {
		type: String,
		required: true,
		unique: true
	},
	bio: {
		type: String
	},
	contactNumber: Number,
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
