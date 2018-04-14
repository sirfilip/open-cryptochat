const express = require('express')

const app = express()
const http = require('http').createServer(app)

const io = require('socket.io')(http)

app.use(express.static('public'))


io.on('connection', (socket) => {
    console.log(`User connected - Socket ID ${socket.id}`)

    // Store the room that the socket is connected to
    // If you need to scale the app horizontally, you'll need to store this variable in a persistent store such as Redis.
    // For more info, see here: https://github.com/socketio/socket.io-redis
    let currentRoom = null

    /** Process a room join request. */
    socket.on('JOIN', (roomName) => {
        // Get chatroom info
        let room = io.sockets.adapter.rooms[roomName]

        // Reject join request if room already has more than 1 connection
        if (room && room.length > 1) {
            // Notify user that their join request was rejected
            io.to(socket.id).emit('ROOM_FULL', null)

            // Notify room that someone tried to join
            socket.broadcast.to(roomName).emit('INTRUSION_ATTEMPT', null)
        } else {
            // Leave current room
            socket.leave(currentRoom)

            // Notify room that user has left
            socket.broadcast.to(currentRoom).emit('USER_DISCONNECTED', null)

            // Join new room
            currentRoom = roomName
            socket.join(currentRoom)

            // Notify user of room join success
            io.to(socket.id).emit('ROOM_JOINED', currentRoom)

            // Notify room that user has joined
            socket.broadcast.to(currentRoom).emit('NEW_CONNECTION', null)
        }
    })

    socket.on('MESSAGE', (msg) => {
        console.log(`New message - ${msg.text}`)
        socket.broadcast.to(currentRoom).emit('MESSAGE', msg)
    })

    /** Broadcast a new publickey to the room */
    socket.on('PUBLIC_KEY', (key) => {
        socket.broadcast.to(currentRoom).emit('PUBLIC_KEY', key)
    })
    
    /** Broadcast a disconnection notification to the room */
    socket.on('disconnect', () => {
        socket.broadcast.to(currentRoom).emit('USER_DISCONNECTED', null)
    })
})


const port = process.env.PORT || 3000
http.listen(port, (err) => {
    if (err) throw err

    console.log(`Chat server listening on port ${port}.`)
})