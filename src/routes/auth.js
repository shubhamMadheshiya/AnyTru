const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');

const auth = require('../middleware/auth');

// Bring in Models & Helpers
const User = require('../models/User');
// const mailchimp = require('../../services/mailchimp');
// const mailgun = require('../../services/mailgun');
const keys = require('../config/keys')
const { EMAIL_PROVIDER, JWT_COOKIE } = require('../constants/index');

const { secret, tokenLife } = keys.jwt;


router.post('/login', async (req, res) => {
	try {
	const { identifier, password } = req.body;

    // Check if identifier and password are provided
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Both identifier and password are required.' });
    }

    // Find user by email or userId
    const user = await User.findOne({ $or: [{ email: identifier }, { userId: identifier }] });
	console.log(user)

		if (!user) {
			return res.status(400).send({ error: 'No user found for this address.' });
		}

		if (user && user.provider !== EMAIL_PROVIDER.Email) {
			return res.status(400).send({
				error: `That email address is already in use using ${user.provider} provider.`
			});
		}

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			return res.status(400).json({
				success: false,
				error: 'Password Incorrect'
			});
		}

		const payload = {
			id: user.id,
			role:user.role,
		};

		const token = jwt.sign(payload, secret, { expiresIn: tokenLife });

		if (!token) {
			throw new Error();
		}

		res.status(200).json({
			success: true,
			token: `Bearer ${token}`,
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: user.role
			}
		});
	} catch (error) {
		console.log(error)
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});


router.post('/register', async (req, res) => {
	
	try {
		const {userId, email, firstName, lastName, password } = req.body;

		if (!email) {
			return res.status(400).json({ error: 'You must enter an email address.' });
		}

		if (!firstName ) {
			return res.status(400).json({ error: 'You must enter your  name.' });
		}

		if (!password) {
			return res.status(400).json({ error: 'You must enter a password.' });
		}

		if (!userId) {
			return res.status(400).json({ error: 'You must enter a userId.' });
		}

		const existingUserEmail = await User.findOne({ email });

		if (existingUserEmail) {
			return res.status(400).json({ error: 'That email address is already in use.' });
		}
		const existingUserId = await User.findOne({ userId });

		if (existingUserId) {
			return res.status(400).json({ error: 'That User Id address is already in use.' });
		}

		// let subscribed = false;
		// if (isSubscribed) {
		// 	const result = await mailchimp.subscribeToNewsletter(email);

		// 	if (result.status === 'subscribed') {
		// 		subscribed = true;
		// 	}
		// }

		// Hash the password
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(password, salt);

		// Create a new user instance
		const user = new User({
			email,
			userId,
			firstName,
			lastName,
			password: hash // Assign the hashed password
		});

		
		const registeredUser = await user.save();

		const payload = {
			id: registeredUser.id,
			role: registeredUser.role,
		};

		// await mailgun.sendEmail(registeredUser.email, 'signup', null, registeredUser);

		const token = jwt.sign(payload, secret, { expiresIn: tokenLife });

		res.status(200).json({
			success: true,
			// subscribed,
			token: `Bearer ${token}`,
			user: {
				id: registeredUser.id,
				firstName: registeredUser.firstName,
				lastName: registeredUser.lastName,
				email: registeredUser.email,
				role: registeredUser.role
			}
		});
	} catch (error) {
		
		res.status(400).json({
			error: 'Your request could not be processed. Please try again.'
		});
	}
});



router.get(
	'/google',
	passport.authenticate('google', {
		session: false,
		scope: ['profile', 'email'],
		accessType: 'offline',
		approvalPrompt: 'force'
	})
);

router.get(
	'/google/callback',
	passport.authenticate('google', {
		failureRedirect: `${keys.app.clientURL}/login`,
		session: false
	}),
	(req, res) => {
		const payload = {
			id: req.user.id
		};

		// TODO find another way to send the token to frontend
		const token = jwt.sign(payload, secret, { expiresIn: tokenLife });
		const jwtToken = `Bearer ${token}`;
		// res.redirect(`${keys.app.clientURL}/dashboard`)
		res.redirect(`${keys.app.clientURL}/auth/success?token=${jwtToken}`);
	}
);

router.get(
	'/facebook',
	passport.authenticate('facebook', {
		session: false,
		scope: ['public_profile', 'email']
	})
);

router.get(
	'/facebook/callback',
	passport.authenticate('facebook', {
		failureRedirect: `${keys.app.clientURL}/login`,
		session: false
	}),
	(req, res) => {
		const payload = {
			id: req.user.id
		};
		const token = jwt.sign(payload, secret, { expiresIn: tokenLife });
		const jwtToken = `Bearer ${token}`;
		res.redirect(`${keys.app.clientURL}/auth/success?token=${jwtToken}`);
	}
);



module.exports = router;