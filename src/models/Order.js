const mongoose = require('mongoose');
const { ORDER_ITEM_STATUS, ORDER_PAYMENT_STATUS } = require('../constants');
const AddressSchema = new mongoose.Schema(
	{
		addressType: {
			type: String,
			enum: ['Home', 'Office', 'Hotel', 'Other'],
			default: 'Home',
			required: true
		},
		address: String,
		city: String,
		state: String,
		country: {
			type: String,
			default: 'India'
		},
		pinCode: String
	},
	{ _id: false }
);

const ProductSchema = new mongoose.Schema(
	{
		_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Product'
		},

		name: {
			type: String,
			trim: true
		},

		imageUrl: {
			type: String
		},

		description: {
			type: String,
			trim: true
		}
	},
	{ _id: false }
);

const singleOrderSchema = new mongoose.Schema({
	product: ProductSchema,
	quantity: {
		type: Number,
		default: 1
	},
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Vendor'
	},
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
	dispatchDay: {
		type: Number
	},
	address: AddressSchema,
	status: {
		type: String,
		default: ORDER_ITEM_STATUS.Not_processed,
		enum: [
			ORDER_ITEM_STATUS.Not_processed,
			ORDER_ITEM_STATUS.Processing,
			ORDER_ITEM_STATUS.Shipped,
			ORDER_ITEM_STATUS.Delivered,
			ORDER_ITEM_STATUS.Cancelled
		]
	}
});
const OrderSchema = new mongoose.Schema(
	{
		orderId: {
			type: String,
			unique: true
		},
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		products: [singleOrderSchema],
		amount: { type: Number, required: true },
		// address: { type: Object, required: true },
		status: {
			type: String,
			default: ORDER_PAYMENT_STATUS.Pending,
			enum: [
				ORDER_PAYMENT_STATUS.Created,
				ORDER_PAYMENT_STATUS.Authorized,
				ORDER_PAYMENT_STATUS.Captured,
				ORDER_PAYMENT_STATUS.Failed,
				ORDER_PAYMENT_STATUS.Refunded,
				ORDER_PAYMENT_STATUS.Pending
			]
		},
		paymentId: {
			type: String
		},
		paymentSignature: {
			type: String
		},
		receipt: {
			type: String
		},
		refundOrder: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Order.products'
			}
		]
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
