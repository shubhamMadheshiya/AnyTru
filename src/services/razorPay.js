const Razorpay = require('razorpay');
const keys = require('../config/keys'); // Assuming you have a keys.js file or object with your Razorpay keys

const instance = new Razorpay({
	key_id: keys.razorpay.accessKeyId,
	key_secret: keys.razorpay.secretAccessKey
});

module.exports = instance;
