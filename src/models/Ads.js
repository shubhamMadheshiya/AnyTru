const mongoose = require('mongoose');

const adsSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	product: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Product',
		required: true
	},
	address: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Address',
		required: true
	},
	pricePerProduct: {
		type: Number,
		required: true
	},
	quantity: {
		type: Number,
		required: true
	},
	vendors: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Vendor'
		}
	],
    isActive:{
        type:Boolean,
        default:true
    },
    category:[{
        type:String,
        default:"category"
    }]
});

const Ads = mongoose.model('Ad', adsSchema);

module.exports = Ads;
