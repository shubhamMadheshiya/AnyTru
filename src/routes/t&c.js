const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
	getTermsAndConditions,
	createTermsAndConditions,
	updateTermsAndConditions,
	deleteTermsAndConditions
} = require('../controllers/t&c');
const role = require('../middleware/role');
const { ROLES } = require('../constants/index');

// GET single terms and conditions
router.get('/', getTermsAndConditions);

// POST create new terms and conditions
router.post('/',auth, role.check(ROLES.Admin), createTermsAndConditions);

// PUT update terms and conditions
router.put('/',auth, role.check(ROLES.Admin), updateTermsAndConditions);

// DELETE terms and conditions
router.delete('/',auth, role.check(ROLES.Admin), deleteTermsAndConditions);

module.exports = router;
