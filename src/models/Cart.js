const Mongoose = require('mongoose');

const { CART_ITEM_STATUS } = require('../constants');

const { Schema } = Mongoose;

// Cart Item Schema
const CartItemSchema = new Schema({
	offerId:{
		type:String
	},
	product: {
		type: Schema.Types.ObjectId,
		ref: 'Product'
	},
	address: {
		type: Schema.Types.ObjectId,
		ref: 'Address',
	},
	vendor: {
		type: Schema.Types.ObjectId,
		ref: 'Vendor'
	},
	quantity: Number,
	pricePerProduct: {
		type: Number,
		default: 0
	},
	totalPrice: {
		type: Number,
		default: 0
	},
	remark: {
		type: String
	},
	dispatchDay:{
		type:Number
	}
	// priceWithTax: {
	//   type: Number,
	//   default: 0
	// },
	// totalTax: {
	//   type: Number,
	//   default: 0
	// },
	// status: {
	//   type: String,
	//   default: CART_ITEM_STATUS.Not_processed,
	//   enum: [
	//     CART_ITEM_STATUS.Not_processed,
	//     CART_ITEM_STATUS.Processing,
	//     CART_ITEM_STATUS.Shipped,
	//     CART_ITEM_STATUS.Delivered,
	//     CART_ITEM_STATUS.Cancelled
	//   ]
	// }
});

module.exports = Mongoose.model('CartItem', CartItemSchema);

// Cart Schema
const CartSchema = new Schema({
  products: [CartItemSchema],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  overAllPrice:{
    type:Number
  }
},{timestamps:true});

module.exports = Mongoose.model('Cart', CartSchema);
