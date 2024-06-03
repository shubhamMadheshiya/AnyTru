const Mongoose = require('mongoose');

const { MERCHANT_STATUS } = require('../constants');

const { Schema } = Mongoose;

// Merchant Schema
const MerchantSchema = new Schema({
	bankName: {
		type: String,
		required: true,
		trim: true
	},
	accNumber: {
		type: String,
		required: true,
		trim: true
	},
	ifsc: {
		type: String,
		required: true,
		trim: true
	},
	upi: {
		type: String,
		required: true,
		trim: true
	},
	panFileUrl: {
		type: String,
		required: true,
		trim: true
	},
	gstinFileUrl: {
		type: String,
		required: true,
		trim: true
	},
	panFileKey: {
		type: String,
		required: true,
		trim: true
	},
	gstinFileKey: {
		type: String,
		required: true,
		trim: true
	},
	// name: {
	//   type: String,
	//   trim: true
	// },
	// email: {
	//   type: String
	// },
	// phoneNumber: {
	//   type: String
	// },
	adharNumber: {
		type: Number,
		required: true,
		trim: true
	},
	brandId: {
		type: String,
		trim: true,
		unique: true,
		required: true
	},
	business: {
		type: String,
		trim: true,
		required: true
	},
	// isActive: {
	// 	type: Boolean,
	// 	default: false
	// },
	// vendor: {
	// 	type: Schema.Types.ObjectId,
	// 	ref: 'Vendor',
	// 	default: null
	// },
	websiteUrl: {
		type: String,
		trim: true
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		default: null
	},
	merchantAddress: {
		billingAddress: { type: String, required: true, trim: true },
		officeAddress: { type: String, required: true, trim: true },
		city: { type: String, required: true, trim: true },
		state: { type: String, required: true, trim: true },
		zipCode: { type: String, required: true, trim: true },
		country: { type: String, required: true, trim: true }
	},
	status: {
		type: String,
		default: MERCHANT_STATUS.Waiting_Approval,
		enum: [MERCHANT_STATUS.Waiting_Approval, MERCHANT_STATUS.Rejected, MERCHANT_STATUS.Approved]
	},
	updated: Date,
	created: {
		type: Date,
		default: Date.now
	}
});

module.exports = Mongoose.model('Merchant', MerchantSchema);
