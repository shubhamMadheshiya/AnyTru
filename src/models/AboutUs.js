// models/aboutUs.js
const mongoose = require('mongoose');

const aboutUsSchema = new mongoose.Schema({
	content: {
		type: String,
		required: true,
        default:"About AnyTru"
	}
},{timestamps: true});

const AboutUs = mongoose.model('AboutUs', aboutUsSchema);

module.exports = AboutUs;
