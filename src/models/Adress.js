const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
	adressType: {
		type: String,
		enum: ['Home', 'Office', 'Hotel', 'Other'],
		default: 'Home',
		required: true
	},
	pincode: { type: Number, required: true },
	houseDetail: { type: String, required: true }
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
