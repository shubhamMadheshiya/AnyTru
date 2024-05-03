const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	category: String,
	tags: {
		type: [String],
		required: true,
		validate: {
			validator: function (v) {
				return v.length >= 5;
			},
			message: 'At least 5 tags are required'
		}
	},
	requiredIn: String,
	link: String,
	likes: {
		type: Number,
		default: 0
	},
	reportPost: {
		type: Boolean,
		default: false
	}
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
