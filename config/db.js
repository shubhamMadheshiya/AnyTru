const mongoose = require('mongoose');
const config = require('./config')

const connectDB = async () => {
	try {
		await mongoose.connect(config.databaseUrl);

		console.log('Connected to MongoDB successfully');
	} catch (err) {
		console.error('Failed to connect to MongoDB:', err);
		process.exit(1);
	}
};

module.exports = connectDB;
