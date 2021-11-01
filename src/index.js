const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMsg, generateLocationMsg } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirPath = path.join(__dirname, '../public')

app.use(express.static(publicDirPath))

io.on('connection', (socket) => {
    console.log('new webSocket connection');

    //socket.on('join', ({ username, room },callback) => {
    socket.on('join', (options, callback) => {

        //const {error, user} =  addUser({id: socket.id, username, room})
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }


        socket.join(user.room)

        socket.emit('message', generateMsg('Admin', 'Wel-Come!!'))
        socket.broadcast.to(user.room).emit('message', generateMsg('Admin', `${user.username} has joined`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

    })

    socket.on('sendMessage', (message, callback) => {

        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback('profanity is not allowed!!')
        }

        io.to(user.room).emit('message', generateMsg(user.username, message))
        callback()
    })

    socket.on('send-location', (coords, callback) => {

        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMsg(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMsg('Admin', `${user.username} has left!!`))

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })

            console.log('user');
        }
    })
})
server.listen(port, () => {
    console.log(`server is running on `, port);
})

