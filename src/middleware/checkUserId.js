const checkUserId =(req, res, next) =>{
    console.log(req.params.id)
	// Extract user ID from JWT token (assumed to be stored in req.user.sub)
	const loggedInUserId = req.user._id.toString();
    console.log(loggedInUserId)

	// Get the user ID from the request parameters
	const targetUserId = req.params.userId;

	// Check if the logged-in user's ID matches the ID from the request parameters
	if (loggedInUserId !== targetUserId) {
		return res.status(403).send('Unauthorized access: You can only access your own data');
	}

	// If they match, proceed to the next middleware
	next();
}

module.exports={checkUserId}


