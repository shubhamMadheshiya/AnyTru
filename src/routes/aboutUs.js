// routes/aboutUs.js
const express = require('express');
const router = express.Router();
const aboutUsController = require('../controllers/aboutUs.controller');
const auth = require('../middleware/auth'); // If authentication is required
const role = require('../middleware/role');
const { ROLES } = require('../constants/index'); // If using roles

// POST request to create information about the organization
router.post('/', auth, role.check(ROLES.Admin), aboutUsController.createAboutUs);

// GET request to get information about the organization
router.get('/', aboutUsController.getAboutUs);

// PUT request to update information about the organization
router.put('/', auth, role.check(ROLES.Admin), aboutUsController.updateAboutUs);

// DELETE request to delete information about the organization
router.delete('/', auth, role.check(ROLES.Admin), aboutUsController.deleteAboutUs);

module.exports = router;
