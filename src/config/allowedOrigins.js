const keys = require('./keys');

const allowedOrigins = [keys.app.adminURL , keys.app.clientURL];

module.exports = allowedOrigins;
