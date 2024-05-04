const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');

// POST request to create a new post
router.post('/', postController.createPost);

// GET request to get all posts
router.get('/', postController.getAllPosts);

// GET request to get post by ID
router.get('/:postId', postController.getPostById);

// PUT request to update post by ID
router.put('/:postId', postController.updatePost);

// DELETE request to delete post by ID
router.delete('/:postId', postController.deletePost);

// PUT request to toggle like/dislike on a post by ID
router.put('/:postId/like', postController.toggleLike);

module.exports = router;
