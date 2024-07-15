const mongoose = require('mongoose');

const { Schema } = mongoose;

const vendorSchema = new Schema({
	vendorId: {
		type: String,
		unique: true,
		trim: true
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	merchantDoc: {
		type: Schema.Types.ObjectId,
		ref: 'Merchant',
		required: true
	},
	websiteUrl: {
		type: String,
		trim: true
	},
	merchantAddress: {
		billingAddress: { type: String, required: true, trim: true },
		officeAddress: { type: String, required: true, trim: true },
		city: { type: String, required: true, trim: true },
		state: { type: String, required: true, trim: true },
		zipCode: { type: String, required: true, trim: true },
		country: { type: String, required: true, trim: true }
	},
	products: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Product'
		}
	],
	rejProducts: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Product'
		}
	],
	rating: {
		type: Number,
		min: 1,
		max: 5,
		default: 1
	},
	image: {
		data: Buffer,
		contentType: String
	},
	description: {
		type: String,
		trim: true
	},
	isActive: {
		type: Boolean,
		default: true
	},
	updated: Date,
	created: {
		type: Date,
		default: Date.now
	}
});

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
