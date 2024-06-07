const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
// Bring in Models & Helpers
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { MERCHANT_STATUS, ROLES, ENDPOINT } = require('../constants');
const Merchant = require('../models/merchant');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Brand = require('../models/brand');
const { s3Upload ,s3Delete } = require('../utils/storage');
const mailgun = require('../services/mailgun');
const storage = multer.memoryStorage();
const NotificationService = require('../services/notificationService');


// File filter function
const fileFilter = (req, file, cb) => {
  // Accept only specific file types (e.g., images and PDFs)
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limit file size to 5MB
  },
  fileFilter: fileFilter
});

// const upload = multer({ storage });


// add merchant api
router.post(
	'/add',
	auth,
	upload.fields([
		{ name: 'pan', maxCount: 1 },
		{ name: 'gstin', maxCount: 1 }
	]),
	async (req, res) => {
		let userId = req.user._id;

		try {
			const findUser = await User.findById(userId);

			if (!findUser.email || !findUser.userId) {
				return res.status(400).json({ error: 'You must update your userId in the profile section.' });
			}
			if (!findUser.phoneNumber) {
				return res.status(400).json({ error: 'You must update your phone number in the profile section.' });
			}

			const findMerchant = await Merchant.findOne({
				user: userId,
				status: { $in: [MERCHANT_STATUS.Approved, MERCHANT_STATUS.Waiting_Approval] }
			});

			if (findMerchant) {
				return res.status(400).json({ error: 'We already have your details as a merchant.' });
			}

			const {
				brandId,
				bankName,
				accNumber,
				ifsc,
				upi,
				business,
				billingAddress,
				officeAddress,
				city,
				state,
				zipCode,
				country,
				websiteUrl,
				adharNumber
			} = req.body;

			if (
				!adharNumber ||
				!brandId ||
				!bankName ||
				!accNumber ||
				!ifsc ||
				!upi ||
				!business ||
				!billingAddress ||
				!officeAddress ||
				!city ||
				!state ||
				!zipCode ||
				!country
			) {
				return res.status(400).json({ error: 'You must enter all details.' });
			}

			const existingMerchant = await Merchant.findOne({ brandId });

			if (existingMerchant) {
				return res.status(400).json({ error: 'That Brand Id is already in use.' });
			}

			// Upload PAN and GSTIN files to S3
			const panFile = req.files['pan'] ? req.files['pan'][0] : null;
			const gstinFile = req.files['gstin'] ? req.files['gstin'][0] : null;

			const panUpload = panFile ? await s3Upload(panFile) : null;
			const gstinUpload = gstinFile ? await s3Upload(gstinFile) : null;

			const panFileUrl = panUpload ? panUpload.imageUrl : null;
			const gstinFileUrl = gstinUpload ? gstinUpload.imageUrl : null;
			const panFileKey = panUpload ? panUpload.imageKey : null;
			const gstinFileKey = gstinUpload ? gstinUpload.imageKey : null;

			const merchant = new Merchant({
				brandId,
				bankName,
				accNumber,
				ifsc,
				upi,
				panFileUrl,
				gstinFileUrl,
				panFileKey,
				gstinFileKey,
				business,
				user: userId,
				websiteUrl,
				adharNumber,
				user: findUser,
				merchantAddress: {
					billingAddress,
					officeAddress,
					city,
					state,
					zipCode,
					country
				}
			});

			const merchantDoc = await merchant.save();

			findUser.merchantReq = merchantDoc;
			await findUser.save();

			await mailgun.sendEmail(findUser.email, 'merchant-application');

			res.status(200).json({
				success: true,
				message: `We received your request! We will reach you on your phone number ${findUser.phoneNumber}!`
			});
		} catch (error) {
			console.log(error);
			return res.status(500).json({
				error: 'Your request could not be processed. Please try again.'
			});
		}
	}
);

// search merchants api
router.get('/search', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const { search } = req.query;
		console.log(`Search query: ${search}`);

		const regex = new RegExp(search, 'i');

		const merchants = await Merchant.find({
			// $or: [{ brandId: { $regex: regex } }, { status: { $regex: regex } }]
		})
			.populate({
				path: 'user',
				match: {
					$or: [{ email: { $regex: regex } }, { firstName: { $regex: regex } }, { userId: { $regex: regex } }]
				},
				select: '-password -provider -followers -orders -cart -created -address -following'
			})
			.sort('-created');

		console.log('Merchants found:', merchants);

		res.status(200).json({
			merchants
		});
	} catch (error) {
		console.error('Error:', error);
		res.status(500).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});


// Fetch all merchants API
router.get('/list', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const { page = 1, limit = 10, status } = req.query;
		const query = status ? { status } : {};

		const merchants = await Merchant.find(query)
			.populate('user', '-password -provider -followers -orders -cart -created -address -following')
			.sort('-created')
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

		const count = await Merchant.countDocuments(query);

		res.status(200).json({
			merchants,
			totalPages: Math.ceil(count / limit),
			currentPage: Number(page),
			count
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});

// // disable merchant account
// router.put('/:id/active', auth, async (req, res) => {
// 	try {
// 		const merchantId = req.params.id;
// 		const update = req.body.isActive;
// 		const query = { _id: merchantId };

// 		const merchantDoc = await Merchant.findOneAndUpdate(query, update, {
// 			new: true
// 		});
// 		if (!update.isActive) {
// 			await deactivateBrand(merchantId);
// 			await mailgun.sendEmail(merchantDoc.email, 'merchant-deactivate-account');
// 		}

// 		res.status(200).json({
// 			success: true
// 		});
// 	} catch (error) {
// 		res.status(400).json({
// 			error: 'Your request could not be processed. Please try again.'
// 		});
// 	}
// });

// approve merchant
router.put('/approve/:id', auth, role.check(ROLES.Admin), async (req, res) => {
	try {
		const merchantId = req.params.id;
		const query = { _id: merchantId };
		const update = {
			status: MERCHANT_STATUS.Approved,
		
		};

		const me = await Merchant.findById(merchantId).populate({ path: 'user', select: 'email firstName _id role' });
		// if (me.status === MERCHANT_STATUS.Approved) {
		// 	return res.status(400).json({
		// 		error: 'This Request already has been approved.'
		// 	});
		// }

		if (me?.user?.role === ROLES.Merchant) {
			return res.status(400).json({
				error: 'User already have Merchant Account.'
			});
		}
		const merchantDoc = await Merchant.findOneAndUpdate(query, update, {
			new: true
		}).populate({ path: 'user', select: 'email firstName _id role' });

		// await mailgun.sendEmail(merchantDoc.user.email, 'merchant-approve', null, merchantDoc.user.firstName);
		
		const userDoc = await createMerchantUser(merchantDoc);

		const notificationData = {
			userId: userDoc._id,
			title: merchantDoc.brandId,
			avatar: userDoc.avatar,
			message: `Congratulation your profile approve as Vendor`,
			url: `${ENDPOINT.UserProfile}${userDoc._id}`,
			// imgUrl: productDoc.imageUrl
		};
		const notification = await NotificationService.createNotification(notificationData);
		
		

		res.status(200).json({
			success: true
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
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
		if (me?.user?.role === ROLES.Merchant) {
			return res.status(400).json({
				error: 'User already have Merchant Account.'
			});
		}
		const merchantDoc = await Merchant.findOneAndUpdate(query, update, {
			new: true
		}).populate({ path: 'user', select: '_id email firstName' });

		await mailgun.sendEmail(merchantDoc.user.email, 'merchant-reject', null, merchantDoc.user.firstName);

		const notificationData = {
			userId: merchantDoc.user._id,
			title: merchantDoc.brandId,
			avatar: merchantDoc.user.avatar || '',
			message: `Sorry, your profile has not been approved as a Vendor.`,
			url: `${ENDPOINT.UserProfile}${merchantDoc.user._id}`
			// imgUrl: productDoc.imageUrl
		};
		const notification = await NotificationService.createNotification(notificationData);
		console.log(notification);
		// await Merchant.findByIdAndDelete(merchantId);

		res.status(200).json({
			success: true
		});
	} catch (error) {
		res.status(500).json({
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

		const merchant = await Merchant.findById(merchantId).populate({ path: 'user', select: 'email firstName _id role' });
		if (!merchant) {
			return res.status(404).json({
				error: 'Merchant not found.'
			});
		}

		if (merchant.status === MERCHANT_STATUS.Approved) {
			return res.status(400).json({
				error: 'This request has already been approved, you cannot delete it.'
			});
		}
		if (merchant.user.role === ROLES.Merchant) {
			return res.status(400).json({
				error: 'User already has a Merchant Account, you cannot delete it.'
			});
		}

		if (merchant.status !== MERCHANT_STATUS.Rejected) {
			return res.status(400).json({
				error: 'Please reject the request first.'
			});
		}

		// Delete PAN and GSTIN files from S3
		const panKey = merchant.panFileKey; // Assuming you store the S3 key of the PAN file in the merchant document
		const gstinKey = merchant.gstinFileKey; // Assuming you store the S3 key of the GSTIN file in the merchant document


		
		await s3Delete([panKey, gstinKey]);

		// Delete merchant from the database
		await Merchant.deleteOne({ _id: merchantId });

		const user = await User.findById(merchant.user._id);
		if (user) {
			user.merchantReq = null;
			await user.save();
		}

		res.status(200).json({
			success: true,
			message: 'Merchant has been deleted successfully!'
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
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
	
	try {
		const newVendor = new Vendor({
			vendorId: merchantDoc.brandId,
			user: merchantDoc.user,
			description: merchantDoc.business,
			merchantDoc: merchantDoc,
			websiteUrl: merchantDoc.websiteUrl,
			merchantAddress: merchantDoc.merchantAddress,
		});

		const vendorDoc = await newVendor.save();

		const query = { _id: merchantDoc.user._id };
		const update = {
			vendor: vendorDoc,
			role: ROLES.Merchant
		};

		await mailgun.sendEmail(merchantDoc.user.email, 'merchant-welcome', null, merchantDoc.user.firstName);

		return await User.findOneAndUpdate(query, update, { new: true });
	} catch (error) {
		throw new Error(`Failed to create merchant user: ${error.message}`);
	}
};

module.exports = router;
