const Post = require('../models/post.model');

// Controller function to create a new post
exports.createPost = async (req, res) => {
	try {
		const newPost = await Post.create(req.body);
		res.status(201).json(newPost);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
};

// Controller function to get all posts
exports.getAllPosts = async (req, res) => {
	try {
		const posts = await Post.find();
		res.status(200).json(posts);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to get post by ID
exports.getPostById = async (req, res) => {
	try {
		const post = await Post.findById(req.params.postId);
		if (!post) {
			return res.status(404).json({ message: 'Post not found' });
		}
		res.status(200).json(post);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to update post by ID
exports.updatePost = async (req, res) => {
	try {
		const updatedPost = await Post.findByIdAndUpdate(req.params.postId, req.body, { new: true });
		if (!updatedPost) {
			return res.status(404).json({ message: 'Post not found' });
		}
		res.status(200).json(updatedPost);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Controller function to delete post by ID
exports.deletePost = async (req, res) => {
	try {
		const deletedPost = await Post.findByIdAndDelete(req.params.postId);
		if (!deletedPost) {
			return res.status(404).json({ message: 'Post not found' });
		}
		res.status(200).json({ message: 'Post deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

const Post = require('../models/post.model');

// Controller function to toggle like/dislike on a post
exports.toggleLike = async (req, res) => {
	try {
		const postId = req.params.postId;
		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ message: 'Post not found' });
		}

		// Check if user has already liked the post
		const userLiked = post.likes.includes(req.user.userId);

		if (userLiked) {
			// If user already liked the post, remove like
			post.likes = post.likes.filter((userId) => userId !== req.user.userId);
		} else {
			// If user hasn't liked the post, add like
			post.likes.push(req.user.userId);
		}

		// Save the updated post
		const updatedPost = await post.save();
		res.status(200).json(updatedPost);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
