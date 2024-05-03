require('dotenv').config();
const config = {
	port: process.env.PORT,
	databaseUrl: process.env.DATABASE_URI,
	env: process.env.NODE_ENV,
	adminDomain: process.env.ADMIN_DOMAIN,
	clientDomain: process.env.CLIENT_DOMAIN
	// jwtSecret: process.env.JWT_SECRET,
	// cloudinaryCloud: process.env.CLOUDINARY_CLOUD,
	// cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
	// cloudinarySecret: process.env.CLOUDINARY_API_SECRET,
	// frontendDomain: process.env.FRONTEND_DOMAIN
};
module.exports = config;
