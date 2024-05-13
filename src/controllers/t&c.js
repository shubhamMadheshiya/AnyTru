const TermsAndConditions = require('../models/T&C');

// Get the single terms and conditions
const getTermsAndConditions = async (req, res) => {
	let terms;
	try {
		terms = await TermsAndConditions.findOne();
		if (!terms) {
			terms = new TermsAndConditions();
		}
		res.status(200).json(terms);
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: error.message });
	}
};

// Create new terms and conditions
const createTermsAndConditions = async (req, res) => {
	try {
		const { content } = req.body;
		const existingTerms = await TermsAndConditions.findOne();
		if (existingTerms) {
			return res.status(400).json({ message: 'Terms and conditions already exist' });
		}
		const terms = new TermsAndConditions({ content });
		const savedTerms = await terms.save();
		res.status(201).json(savedTerms);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// Update terms and conditions
const updateTermsAndConditions = async (req, res) => {
	try {
		const { content } = req.body;
		const updatedTerms = await TermsAndConditions.findOneAndUpdate({}, { content }, { new: true });
		res.status(200).json(updatedTerms);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// Delete terms and conditions
const deleteTermsAndConditions = async (req, res) => {
	try {
		await TermsAndConditions.deleteOne();
		res.status(200).json({ message: 'Terms and conditions deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

module.exports = {
	getTermsAndConditions,
	createTermsAndConditions,
	updateTermsAndConditions,
	deleteTermsAndConditions
};
