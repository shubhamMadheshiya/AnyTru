const Mongoose = require('mongoose');
const { Schema } = Mongoose;

// Address Schema
const AddressSchema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	},
	addressType: {
		type: String,
		enum: ['Home', 'Office', 'Hotel', 'Other'],
		default: 'Home',
		required: true
	},
	address: {
		type: String
	},
	city: {
		type: String
	},
	state: {
		type: String
	},
	country: {
		type: String,
		default: 'India'
	},
	pinCode: {
		type: String
	},
	isDefault: {
		type: Boolean,
		default: false
	},
	updated: Date,
	created: {
		type: Date,
		default: Date.now
	}
});

module.exports = Mongoose.model('Address', AddressSchema);
