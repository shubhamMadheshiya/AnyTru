const mongoose = require('mongoose');
const keys = require('./keys');

const connectDB = async () => {
	try {
		await mongoose.connect(keys.database.url);

		console.log('Connected to MongoDB successfully');
	} catch (err) {
		console.error('Failed to connect to MongoDB:', err);
		process.exit(1);
	}
};

module.exports = connectDB;
