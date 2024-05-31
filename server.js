// server.js or app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./src/utils/swagger-output.json');
const connectDB = require('./src/config/db');
const corsOptions = require('./src/config/corsOptions');
const passportConfig = require('./src/config/passport');
const keys = require('./src/config/keys');
const configureSocket = require('./src/socket');

const app = express();
const server = require('http').createServer(app);
const io = configureSocket(server);

const PORT = keys.port;

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

// Initialize Passport
passportConfig.initializePassport(app);

// routes
app.use('/', require('./src/routes/root'));

app.use('/auth', require('./src/routes/auth'));
app.use('/user', require('./src/routes/user'));
app.use('/logout', require('./src/routes/logout'));
app.use('/product', require('./src/routes/product'));
app.use('/wishlist', require('./src/routes/wishlist'));
app.use('/cart', require('./src/routes/cart'));
app.use('/address', require('./src/routes/address'));
app.use('/aboutUs', require('./src/routes/aboutUs'));
app.use('/t&c', require('./src/routes/t&c'));
app.use('/contact', require('./src/routes/contact'));
app.use('/merchant', require('./src/routes/merchant'));
app.use('/vendor', require('./src/routes/vendor'));
app.use('/ads', require('./src/routes/ads'));
app.use('/order', require('./src/routes/order'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

mongoose.connection.once('open', () => {
	console.log('Connected to MongoDB');
	server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
