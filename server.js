require('dotenv').config();
const express = require('express')
const cors = require('cors')
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const config = require('./config/config');
const connectDB = require('./config/db');
const corsOptions = require('./config/corsOptions');

const app = express();

const PORT = config.port || 6000;

// Connect to MongoDB
connectDB();

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json 
app.use(express.json());

//middleware for cookies
app.use(cookieParser());

//serve static files
app.use('/', express.static(path.join(__dirname, '/public')));

mongoose.connection.once('open', () => {
	console.log('Connected to MongoDB');
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
