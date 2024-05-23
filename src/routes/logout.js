const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
	// req.logout(function (err) {
	// 	if (err) {
	// 		return next(err);
	// 	}
	
	// });
	console.log("logout")
		res.redirect('http://localhost:3000');
});

module.exports = router;
