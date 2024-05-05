const { ROLES } = require('../constants/index');

const authorizeRole = (requiredRole) => (req, res, next) => {
	if (!req.user) {
		return res.status(403).send('Access denied: User not authenticated');
	}
	if (req.user.role === ROLES.Admin) {
		// If the user is an admin, proceed to the next middleware
		return next();
	}

	if (req.user.role !== requiredRole) {
		return res.status(403).send('Access denied: Insufficient permissions');
	}

	

	if (req.user.role === ROLES.User) {
		// Extract user ID from JWT token (assumed to be stored in req.user.sub)
		const loggedInUserId = req.user._id.toString();

		// Get the user ID from the request parameters
		const targetUserId = req.params.userId;

		// Check if the logged-in user's ID matches the ID from the request parameters
		if (loggedInUserId !== targetUserId) {
			return res.status(403).send('Unauthorized access: You can only access your own data');
		}

		// If they match, proceed to the next middleware
		return next();
	}

	// If none of the conditions are met, return a generic error
	return res.status(500).send('Internal server error');
};

module.exports = { authorizeRole };
