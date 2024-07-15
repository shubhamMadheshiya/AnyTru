const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    itemType: {
        type: String,
        enum: ['Product', 'User'],
        required: true
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        // refPath: 'itemType', // Dynamically reference either 'Product' or 'User' based on itemType
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Reference to the User model if needed
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
