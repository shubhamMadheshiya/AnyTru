const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Bring in Models & Helpers
const { MERCHANT_STATUS, ROLES } = require('../constants');
const Merchant = require('../models/merchant');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Brand = require('../models/brand');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const mailgun = require('../services/mailgun');

// add merchant api
router.post('/add', auth, role.check(ROLES.User), async (req, res) => {
	let userId = req.user._id;

	try {
		const findUser = await User.findById(userId);

		if (!findUser.email) {
			return res.status(400).json({ error: 'You must update your email in profile section.' });
		}
		if (!findUser.userId) {
			return res.status(400).json({ error: 'You must update your UserId in profile section.' });
		}
		if (!findUser.phoneNumber) {
			return res.status(400).json({ error: 'You must update your phone Number in profile section.' });
		}
		const findMerchant = await Merchant.findOne({ user: userId });
		if (findMerchant) {
			return res.status(400).json({ error: 'This User already have Merchant Account' });
		}

		//     const findMerchant = await Merchant.findById({}).populate({
		//   path: 'user',
		//   match: { email: authorEmail } // Match the author's email
		// });

		// console.log(findMerchant);

		const { brandId, bankName, accNumber, ifsc, upi, pan, gstin, adharNumber, business } = req.body;

		if (!brandId || !bankName || !accNumber || !ifsc || !upi || !pan || !gstin || !adharNumber || !business) {
			return res.status(400).json({ error: 'You must enter all details.' });
		}

		const existingMerchant = await Merchant.findOne({ brandId });

		if (existingMerchant) {
			return res.status(400).json({ error: 'That Brand Id is already in use.' });
		}

		const merchant = new Merchant({
			brandId,
			bankName,
			accNumber,
			ifsc,
			upi,
			pan,
			gstin,
			adharNumber,
			business,
			user: userId
		});
		const merchantDoc = await merchant.save();

		await mailgun.sendEmail(findUser.email, 'merchant-application');

		res.status(200).json({
			success: true,
			message: `We received your request! we will reach you on your phone number ${findUser.phoneNumber}!`,
			merchant: merchantDoc
		});
	} catch (error) {
		console.log(error);
		return res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// search merchants api
router.get('/search', auth, async (req, res) => {
	try {
		const { search } = req.query;
		console.log(search);

		const regex = new RegExp(search, 'i');

		const merchants = await Merchant.find({
			$or: [{ brandId: { $regex: regex } }, { status: { $regex: regex } }]
		}).populate({
			path: 'user',
			match: {
				$or: [{ email: { $regex: regex } }, { firstName: { $regex: regex } }, { userId: { $regex: regex } }]
			}
		});

		res.status(200).json({
			merchants
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// fetch all merchants api
router.get('/', auth, async (req, res) => {
	try {
		const { page = 1, limit = 10 } = req.query;

		const merchants = await Merchant.find()
			.populate('user')
			.sort('-created')
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

		const count = await Merchant.countDocuments();

		res.status(200).json({
			merchants,
			totalPages: Math.ceil(count / limit),
			currentPage: Number(page),
			count
		});
	} catch (error) {
    console.log(error)
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// disable merchant account
router.put('/:id/active', auth, async (req, res) => {
	try {
		const merchantId = req.params.id;
		const update = req.body.isActive;
		const query = { _id: merchantId };

		const merchantDoc = await Merchant.findOneAndUpdate(query, update, {
			new: true
		});
		if (!update.isActive) {
			await deactivateBrand(merchantId);
			await mailgun.sendEmail(merchantDoc.email, 'merchant-deactivate-account');
		}

		res.status(200).json({
			success: true
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// approve merchant
router.put('/approve/:id', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const merchantId = req.params.id;
		const query = { _id: merchantId };
		const update = {
			status: MERCHANT_STATUS.Approved,
			isActive: true
		};

		const me = await Merchant.findById(merchantId).populate({ path: 'user', select: 'email firstName _id role' });
		if (me.status === MERCHANT_STATUS.Approved) {
			return res.status(400).json({
				error: 'This Request already has been approved.'
			});
		}
		if (me.user.role === ROLES.Merchant) {
			return res.status(400).json({
				error: 'User already have Merchant Account.'
			});
		}
		const merchantDoc = await Merchant.findOneAndUpdate(query, update, {
			new: true
		}).populate({ path: 'user', select: 'email firstName _id role' });

		// await mailgun.sendEmail(merchantDoc.user.email, 'merchant-approve', null, merchantDoc.user.firstName);
		console.log(merchantDoc.user);
		await createMerchantUser(
			merchantDoc
		);

		res.status(200).json({
			success: true
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// reject merchant
router.put('/reject/:id', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const merchantId = req.params.id;

		const query = { _id: merchantId };
		const update = {
			status: MERCHANT_STATUS.Rejected
		};
		const me = await Merchant.findById(merchantId).populate({ path: 'user', select: 'email firstName _id role' });
		if (me.status === MERCHANT_STATUS.Rejected) {
			return res.status(400).json({
				error: 'This Request already has been rejected.'
			});
		}
		if (me.user.role === ROLES.Merchant) {
			return res.status(400).json({
				error: 'User already have Merchant Account.'
			});
		}
		const merchantDoc = await Merchant.findOneAndUpdate(query, update, {
			new: true
		}).populate({ path: 'user', select: 'email firstName' });

		await mailgun.sendEmail(merchantDoc.user.email, 'merchant-reject', null, merchantDoc.user.firstName);

		// await Merchant.findByIdAndDelete(merchantId);

		res.status(200).json({
			success: true
		});
	} catch (error) {
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// router.post('/signup/:token', async (req, res) => {
// 	try {
// 		const { email, firstName, lastName, password } = req.body;

// 		if (!email) {
// 			return res.status(400).json({ error: 'You must enter an email address.' });
// 		}

// 		if (!firstName || !lastName) {
// 			return res.status(400).json({ error: 'You must enter your full name.' });
// 		}

// 		if (!password) {
// 			return res.status(400).json({ error: 'You must enter a password.' });
// 		}

// 		const userDoc = await User.findOne({
// 			email,
// 			resetPasswordToken: req.params.token
// 		});

// 		const salt = await bcrypt.genSalt(10);
// 		const hash = await bcrypt.hash(password, salt);

// 		const query = { _id: userDoc._id };
// 		const update = {
// 			email,
// 			firstName,
// 			lastName,
// 			password: hash,
// 			resetPasswordToken: undefined
// 		};

// 		await User.findOneAndUpdate(query, update, {
// 			new: true
// 		});

// 		const merchantDoc = await Merchant.findOne({
// 			email
// 		});

// 		await createMerchantBrand(merchantDoc);

// 		res.status(200).json({
// 			success: true
// 		});
// 	} catch (error) {
// 		res.status(400).json({
// 			error: 'Your request could not be processed. Please try again.'
// 		});
// 	}
// });

router.delete('/delete/:id', auth, role.check(ROLES.Admin), async (req, res) => {

	try {
		const merchantId = req.params.id;
		// await deactivateBrand(merchantId);
    
		const me = await Merchant.findById(merchantId).populate({ path: 'user', select: 'email firstName _id role' });
		if (me.status === MERCHANT_STATUS.Approved) {
			return res.status(400).json({
				error: 'This Request already has been approved you can not delete.'
			});
		}
		if (me.user.role === ROLES.Merchant) {
			return res.status(400).json({
				error: 'User already have Merchant Account you can not delete.'
			});
		}
		const merchant = await Merchant.deleteOne({ _id: merchantId });

		res.status(200).json({
			success: true,
			message: `Merchant has been deleted successfully!`,
			merchant
		});
	} catch (error) {
    console.log(error)
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// const deactivateBrand = async (merchantId) => {
// 	const merchantDoc = await Merchant.findOne({ _id: merchantId }).populate('brand', '_id');
// 	if (!merchantDoc || !merchantDoc.brand) return;
// 	const brandId = merchantDoc.brand._id;
// 	const query = { _id: brandId };
// 	const update = {
// 		isActive: false
// 	};
// 	return await Brand.findOneAndUpdate(query, update, {
// 		new: true
// 	});
// };

// const createMerchantBrand = async ({ userId, merchantId, brandId, description }) => {
// 	try {
// 		const newVendor = new Vendor({
// 			name: brandId,
// 			user: userId,
// 			description: description,
// 			merchant: merchantId,
// 			isActive: false
// 		});

// 		const vendorDoc = await newVendor.save();

// 		const update = {
// 			vendor: vendorDoc._id
// 		};

// 		await Merchant.findOneAndUpdate({ _id: merchantId }, update);
//     await User.findOneAndUpdate({_id:userId}, update, { new: true });

// 		return vendorDoc;
// 	} catch (error) {
// 		throw new Error(`Failed to create merchant brand: ${error.message}`);
// 	}
// };

const createMerchantUser = async (merchantDoc) => {


  console.log(merchantDoc)
	try {
		const newVendor = new Vendor({
			name: merchantDoc.brandId,
			user: merchantDoc.user._id,
			description: merchantDoc.business,
			merchant: merchantDoc._id,
			isActive: true
		});

		const vendorDoc = await newVendor.save();

		const query = { _id: merchantDoc.user._id };
		const update = {
			vendor: vendorDoc._id,
			merchant: merchantDoc._id,
			role: ROLES.Merchant
		};

		await mailgun.sendEmail(merchantDoc.user.email, 'merchant-welcome', null, merchantDoc.user.firstName);

		return await User.findOneAndUpdate(query, update, { new: true });
	} catch (error) {
		throw new Error(`Failed to create merchant user: ${error.message}`);
	}
};

module.exports = router;
