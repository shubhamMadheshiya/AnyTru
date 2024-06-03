// src/models/MerchantAddress.js

const mongoose = require('mongoose');

const { Schema } = mongoose;

const MerchantAddressSchema = new Schema(
	{
		// merchant: { type: Schema.Types.ObjectId, ref: 'Merchant', default: null },
		// vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
		billingAddress: {
			type: String,
			required: true,
			trim: true
		},
		officeAddress: {
			type: String,
			required: true,
			trim: true
		},
		city: {
			type: String,
			required: true,
			trim: true
		},
		state: {
			type: String,
			required: true,
			trim: true
		},
		zipCode: {
			type: String,
			required: true,
			trim: true
		},
		country: {
			type: String,
			required: true,
			trim: true
		}
	},
	{ timestamps: true }
);

const MerchantAddress = mongoose.model('MerchantAddress', MerchantAddressSchema);

module.exports = MerchantAddress;
