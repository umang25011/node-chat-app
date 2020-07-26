const express = require('express')
const http = require('http')
const path = require('path')
const sockerio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/message')
const {
	addUser,
	removeUser,
	getUser,
	getUsersInRoom,
} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = sockerio(server)

const PORT = process.env.port || 3000
const publicPath = path.join(__dirname, '../public')

app.use(express.static(publicPath))

io.on('connection', (socket) => {
	socket.on('join', ({ username, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, username, room })

		if (error) return callback(error)

		socket.join(room)
		socket.emit('message', generateMessage('Admin', 'Welcome'))
		socket
			.to(user.room)
			.emit(
				'message',
				generateMessage('Admin', `${user.username} has Joined!.`)
			)
		io.to(user.room).emit('roomData', {
			room: user.room,
			users: getUsersInRoom(user.room),
		})
		callback()
	})
	socket.on('sendMessage', (message, callback) => {
		const filter = new Filter()
		if (filter.isProfane(message)) {
			return callback('Not Allowed')
		}
		const user = getUser(socket.id)
		io.to(user.room).emit(
			'message',
			generateMessage(user.username, message)
		)
		callback()
	})
	socket.on('sendLocation', (position, callback) => {
		const user = getUser(socket.id)
		io.to(user.room).emit(
			'locationMessage',
			generateLocationMessage(
				user.username,
				`https://google.com/maps?q=${position.lat},${position.lon}`
			)
		)
		callback()
	})
	socket.on('disconnect', () => {
		const user = removeUser(socket.id)
		if (user) {
			socket
				.to(user.room)
				.emit(
					'message',
					generateMessage('Admin', `${user.username} has left!`)
				)
			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room),
			})
		}
	})
})

server.listen(PORT, () => console.log('Connected....to 3000'))
