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
	pan: {
		type: String,
		required: true,
		trim: true
	},
	gstin: {
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
	isActive: {
		type: Boolean,
		default: false
	},
	vendor: {
		type: Schema.Types.ObjectId,
		ref: 'Vendor',
		default: null
	},
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		default: null
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
