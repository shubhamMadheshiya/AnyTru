// models/aboutUs.js
const mongoose = require('mongoose');

const aboutUsSchema = new mongoose.Schema({
	content: {
		type: String,
		required: true,
        default:"About AnyTru yet not Created"
	}
},{timestamps: true});

const AboutUs = mongoose.model('AboutUs', aboutUsSchema);

module.exports = AboutUs;
