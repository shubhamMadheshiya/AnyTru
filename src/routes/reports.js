const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { ROLES } = require('../constants');
const User = require('../models/User');
const Product = require('../models/Product');

// POST /reports/post/:postId
router.post('/post/:postId', auth, async (req, res) => {
	const { postId } = req.params;
	const  reason  = req.body.reason.trim();
	const reportedBy = req.user.id;

    if (!reason || reason == '') {
        return res.status(404).json({error:'Please Give reason'})
		}
        if (!postId) {
            return res.status(400).json({ error: 'Please provide postId' });
            
        }

        const post = await Product.findById(postId);
        if (!post) {
            return res.status(404).json({error:'Post not found'})
            
        }

	try {
		const report = new Report({
			itemType: 'Product', // Assuming this is correct based on your logic
			itemId: postId,
			reason,
			reportedBy
		});

		const result = await report.save();
		res.status(201).json({ message: 'Post reported successfully', result });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// POST /reports/user/:userId
router.post('/user/:userId', auth, async (req, res) => {
	const { userId } = req.params;
	const reason  = req.body.reason.trim();
	const reportedBy = req.user.id;

    
    if (!reason || reason == '') {
			return res.status(404).json({ error: 'Please Give reason' });
		}
		if (!userId) {
			return res.status(400).json({ error: 'Please provide userId' });
		}

		const user = await User.findById(userId);

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

	try {
		const report = new Report({
			itemType: 'User', // Assuming this is correct based on your logic
			itemId: userId,
			reason,
			reportedBy
		});

		await report.save();
		res.status(201).json({ success: true, message: 'User reported successfully' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

// GET /reports
// GET /reports
router.get('/', auth, role.check(ROLES.Admin), async (req, res) => {
    const { itemType } = req.query;
    let reports;

    try {
        if (itemType == 'Product' || itemType == 'User') {
					reports = await Report.find({ itemType }).sort({ createdAt: -1 });
				} else {
					reports = await Report.find().sort({ createdAt: -1 });
				}

        const productIds = reports
            .filter(report => report.itemType === 'Product')
            .map(report => report.itemId);

        const userIds = reports
            .filter(report => report.itemType === 'User')
            .map(report => report.itemId);

        const [products, users] = await Promise.all([
            Product.find({ _id: { $in: productIds } }, { _id: 1, name: 1, slug: 1, isActive: 1, imageUrl: 1 }),
            User.find({ _id: { $in: userIds } }, { _id: 1, userId: 1, avatar: 1 })
        ]);

        const productMap = products.reduce((map, product) => {
            map[product._id] = product;
            return map;
        }, {});

        const userMap = users.reduce((map, user) => {
            map[user._id] = user;
            return map;
        }, {});

        const result = reports.map(report => {
            if (report.itemType === 'Product') {
                return {
                    ...report.toObject(),
                    item: productMap[report.itemId]
                };
            } else if (report.itemType === 'User') {
                return {
                    ...report.toObject(),
                    item: userMap[report.itemId]
                };
            }
            return report.toObject();
        });

        res.json({ reports: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



module.exports = router;
