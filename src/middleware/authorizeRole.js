const authorizeRole = (requiredRole) => (req, res, next) => {
	if (req.user && req.user.role === requiredRole) {
		next();
	} else {
		res.status(403).send('Access denied');
	}
};


module.exports={authorizeRole}