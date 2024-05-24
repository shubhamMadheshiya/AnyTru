const mongoose = require('mongoose');
const { ORDER_ITEM_STATUS, ORDER_PAYMENT_STATUS } = require('../constants');

const OrderSchema = new mongoose.Schema(
	{
		orderId: {
			type: String,
			unique: true
		},
		user: { type: String, required: true },
		products: [
			{
				product: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Product'
				},
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
				address: {
					type: mongoose.Schema.Types.ObjectId,
					ref: 'Address'
				},
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
			}
		],
		amount: { type: Number, required: true },
		address: { type: Object, required: true },
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
		receipt: {
			type: String
		}
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
