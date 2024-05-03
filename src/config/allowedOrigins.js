const config = require('./config')

const allowedOrigins = [config.clientDomain, config.adminDomain];

module.exports = allowedOrigins;