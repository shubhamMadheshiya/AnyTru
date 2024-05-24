exports.ROLES = {
  Admin: 'ADMIN',
  User: 'USER',
  Merchant: 'MERCHANT'
};

exports.MERCHANT_STATUS = {
  Rejected: 'Rejected',
  Approved: 'Approved',
  Waiting_Approval: 'Waiting Approval'
};

exports.ORDER_ITEM_STATUS = {
  Processing: 'Processing',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
  Not_processed: 'Not processed'
};
exports.ORDER_PAYMENT_STATUS = {
	Created:'created',
Authorized: 'authorized',
Captured:'captured',
Failed: 'failed',
Refunded:'refunded',
Pending: 'pending',
}

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

exports.JWT_COOKIE = 'x-jwt-cookie';
