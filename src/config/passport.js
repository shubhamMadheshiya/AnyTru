const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const mongoose = require('mongoose');

const keys = require('./keys');
const { EMAIL_PROVIDER } = require('../constants');
const User = require('../models/User'); // Adjust the path if necessary

const { google, facebook } = keys;

const secret = keys.jwt.secret;

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = secret;

passport.use(
	new JwtStrategy(opts, (payload, done) => {
		User.findById(payload.id)
			.then((user) => {
				if (user) {
					return done(null, user);
				}
				return done(null, false);
			})
			.catch((err) => {
				return done(err, false);
			});
	})
);

const googleAuth = () => {

	passport.use(
		new GoogleStrategy(
			{
				clientID: google.clientID,
				clientSecret: google.clientSecret,
				callbackURL: "/auth/google/callback",
				scope: ['profile', 'email'],
			},
			async (accessToken, refreshToken, profile, done) => {
				try {
					let user = await User.findOne({ email: profile.email });
					if (user) {
						return done(null, user);
					}

				

					const name = profile.displayName.split(' ');

					const newUser = new User({
						provider: EMAIL_PROVIDER.Google,
						googleId: profile.id,
						email: profile.email,
						firstName: name[0],
						lastName: name[1],
						avatar: profile.picture,
						password: null
					});

					user = await newUser.save();
					return done(null, user);
				} catch (err) {
					return done(err, false);
				}
			}
		)
	);
};

const facebookAuth = () => {
	passport.use(
		new FacebookStrategy(
			{
				clientID: facebook.clientID,
				clientSecret: facebook.clientSecret,
				callbackURL: facebook.callbackURL,
				profileFields: ['id', 'displayName', 'name', 'emails', 'picture.type(large)']
			},
			async (accessToken, refreshToken, profile, done) => {
				try {
					let user = await User.findOne({ facebookId: profile.id });
					if (user) {
						return done(null, user);
					}

					const newUser = new User({
						provider: EMAIL_PROVIDER.Facebook,
						facebookId: profile.id,
						email: profile.emails ? profile.emails[0].value : null,
						firstName: profile.name.givenName,
						lastName: profile.name.familyName,
						avatar: profile.photos[0].value,
						password: null
					});

					user = await newUser.save();
					return done(null, user);
				} catch (err) {
					return done(err, false);
				}
			}
		)
	);
};

module.exports = {
	initializePassport: (app) => {
		app.use(passport.initialize());
		googleAuth();
		facebookAuth();
	},
	passport
};
