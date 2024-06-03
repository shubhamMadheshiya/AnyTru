const keys = require('../config/keys');

exports.ROLES = {
	Admin: 'ADMIN',
	User: 'USER',
	Merchant: 'MERCHANT'
};
exports.CATEGORIES = {
	Furniture: 'Furniture',
	Clothing: 'Clothing',
	PrintsGraphics: 'Prints & Graphics',
	HomeDecor: 'Home Decor ',
	Jewellery: 'Jewellery',
	EventSetups: 'Event Setups',
	Accessories: 'Accessories',
	Others: 'Others'
};

exports.ADMIN_EMAILS = ['Anytruofficial@gmail.com'];

exports.MERCHANT_STATUS = {
	Rejected: 'Rejected',
	Approved: 'Approved',
	Waiting_Approval: 'Waiting_Approval'
};

exports.ORDER_ITEM_STATUS = {
	Processing: 'Processing',
	Shipped: 'Shipped',
	Delivered: 'Delivered',
	Cancelled: 'Cancelled',
	Not_processed: 'Not processed'
};
exports.ORDER_PAYMENT_STATUS = {
	Created: 'created',
	Authorized: 'authorized',
	Captured: 'captured',
	Failed: 'failed',
	Refunded: 'refunded',
	Pending: 'pending'
};

exports.REVIEW_STATUS = {
	Rejected: 'Rejected',
	Approved: 'Approved',
	Waiting_Approval: 'Waiting Approval'
};

exports.EMAIL_PROVIDER = {
	Email: 'Email',
	Google: 'Google',
	Facebook: 'Facebook'
};

exports.ENDPOINT = {
	Product: '/product/', //approveProduct / likes
	UserProfile: '/user/', //follow rating
	Ads: '/ads/', //ads bid
	Order: '/order/', //order
	Message: '/message/' //message
};

exports.JWT_COOKIE = 'x-jwt-cookie';
