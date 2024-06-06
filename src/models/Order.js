const mongoose = require('mongoose');
const { ORDER_ITEM_STATUS, ORDER_PAYMENT_STATUS , CATEGORIES } = require('../constants');

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
		imageUrl: {
			type: String
		},

		imageKey: {
			type: String,
			trim: true
		},
		category: [
			{
				type: String,
				default: CATEGORIES.Others,
				enum: [
					CATEGORIES.Others,
					CATEGORIES.Accessories,
					CATEGORIES.Clothing,
					CATEGORIES.EventSetups,
					CATEGORIES.Furniture,
					CATEGORIES.HomeDecor,
					CATEGORIES.Jewellery,
					CATEGORIES.PrintsGraphics
				]
			}
		]
	},
	{ _id: false }
);

const OrderSchema = new mongoose.Schema(
	{
		orderId: {
			type: String,
			unique: true
		},
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
		
		
		// address: { type: Object, required: true },
		PaymentStatus: {
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
		orderStatus: {
			type: String,
			default: ORDER_ITEM_STATUS.Not_processed,
			enum: [
				ORDER_ITEM_STATUS.Not_processed,
				ORDER_ITEM_STATUS.Processing,
				ORDER_ITEM_STATUS.Shipped,
				ORDER_ITEM_STATUS.Delivered,
				ORDER_ITEM_STATUS.Cancelled
			]
		},
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
			default: 0,
			required: true,
		},
		totalAmount: {
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
		paymentId: {
			type: String
		},
		paymentSignature: {
			type: String
		},
		receipt: {
			type: String
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
