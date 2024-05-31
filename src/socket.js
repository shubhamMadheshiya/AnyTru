// src/socket.js
const socketio = require('socket.io');

const configureSocket = (server) => {
	const io = socketio(server);

	io.on('connection', (socket) => {
		console.log('A user connected');

		// Handle incoming chat messages
		socket.on('chat message', (msg) => {
			// Broadcast the message to all connected clients
			io.emit('chat message', msg);
		});

		// Handle user disconnect
		socket.on('disconnect', () => {
			console.log('A user disconnected');
		});
	});

	return io;
};

module.exports = configureSocket;
