// controllers/aboutUs.controller.js
const AboutUs = require('../models/AboutUs');

// Controller function to create information about the organization
exports.createAboutUs = async (req, res) => {
	try {
		const { content } = req.body;
		const aboutUs = new AboutUs({ content });
		const savedAboutUs = await aboutUs.save();
		res.status(201).json({ success: true,  message: 'About Us information created successfully' ,savedAboutUs});
	} catch (error) {
		res.status(400).json({error: 'Your request could not be processed. Please try again.' });
	}
};

// Controller function to get information about the organization
exports.getAboutUs = async (req, res) => {
	try {
		let aboutUs = await AboutUs.findOne();

		// If aboutUs document doesn't exist, create a new one with the default content
		if (!aboutUs) {
			aboutUs = new AboutUs();
		}

		res.status(200).json({aboutUs});
	} catch (error) {
		res.status(500).json({error: 'Your request could not be processed. Please try again.' });
	}
};

// Controller function to update information about the organization
exports.updateAboutUs = async (req, res) => {
	try {
		const { content } = req.body;
		const updatedAboutUs = await AboutUs.findOneAndUpdate({}, { content }, { new: true });
		res.status(200).json({ success: true,  message: 'About Us information updated successfully' ,updatedAboutUs });
	} catch (error) {
		res.status(400).json({ error: 'Your request could not be processed. Please try again.' });
	}
};

// Controller function to delete information about the organization
exports.deleteAboutUs = async (req, res) => {
	try {
		await AboutUs.deleteOne();
		res.status(200).json({success: true, message: 'About Us information deleted successfully' });
	} catch (error) {
		res.status(500).json({error: 'Your request could not be processed. Please try again.' });
	}
};
