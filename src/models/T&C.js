const mongoose = require('mongoose');

const termsAndConditionsSchema = new mongoose.Schema(
	{
		content: {
			type: String,
			required: true,
			default: 'Terms and conditions of AnyTru yet not Created'
		}
	},
	{ timestamps: true }
);

const TermsAndConditions = mongoose.model('TermsAndConditions', termsAndConditionsSchema);

module.exports = TermsAndConditions;
