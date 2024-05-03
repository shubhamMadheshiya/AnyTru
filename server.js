require('dotenv').config();
const express = require('express')
const config = require('./config/config')
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const app = express();

const PORT = config.port || 6000;

// Connect to MongoDB
connectDB();


mongoose.connection.once('open', () => {
	console.log('Connected to MongoDB');
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
