const mongoose = require('mongoose');

const { Schema } = mongoose;

const vendorSchema = new Schema({
	name: {
		type: String,
		unique: true,
		trim: true
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	merchant: {
		type: Schema.Types.ObjectId,
		ref: 'Merchant',
		required: true
	},
	ads: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Ads'
		}
	],
	rejAds: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Ads'
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
