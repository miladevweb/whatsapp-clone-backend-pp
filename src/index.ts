import cors from 'cors'
import morgan from 'morgan'
import express from 'express'
import { Server } from 'socket.io'
import { router } from './routes/chat'
import { createServer } from 'node:http'
import { addMessageToRoom, addUserToRoom, checkIfUserIsInRoom, createRoom, getMissingMessages, checkRoom } from './actions'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
   cors: {
      credentials: true,
      origin: process.env.CLIENT_URL ?? '*',
   },
   connectionStateRecovery: { maxDisconnectionDuration: 1000 * 60 },
})

io.on('connection', async (socket) => {
   console.log('A user connected 👍')
   socket.on('disconnect', () => console.log('A user has disconnected 😭'))

   socket.on('client:join', async (options) => {
      try {
         const { roomName, anotherUserId, myId } = options
         /* We check if the room exists */
         const roomId = await checkRoom(roomName)

         /* If the room doesn't exist, we create it and add the user to it */
         if (!roomId) await createRoom(roomName, anotherUserId, myId)
         else {
            /* We check if the user is in the room */
            const anotherUser = await checkIfUserIsInRoom(anotherUserId, roomId.id)
            if (!anotherUser) await addUserToRoom(roomId.id, anotherUserId)
         }
         socket.join(roomName)
         socket.handshake.auth.roomName = roomName
      } catch (error) {
         console.log(error, 'ERROR_JOINING_ROOM ❌')
      }
   })

   socket.on('client:leave', () => {
      const room = socket.handshake.auth.roomName
      if (room) {
         socket.leave(room)
         socket.handshake.auth.roomName = ''
      }
   })

   socket.on('client:message', async (options) => {
      const { content, myId, myUsername } = options
      try {
         const roomId = await checkRoom(socket.handshake.auth.roomName)
         /* We add the message to the databse */
         if (!roomId) return
         else {
            const { id: messageId } = await addMessageToRoom(content, roomId.id, myId)
            socket.to(socket.handshake.auth.roomName).emit('server:message', { content, messageId, myUsername })
         }
      } catch (error) {
         console.log(error, 'ERROR_SENDING_MESSAGE ❌')
      }
   })

   if (!socket.recovered) {
      try {
         if (socket.handshake.auth.room) {
            const roomId = await checkRoom(socket.handshake.auth.room)

            if (!roomId) return
            const messagesInfo = await getMissingMessages(socket.handshake.auth.serverOffset, roomId.id)

            messagesInfo.forEach((info) => {
               socket.emit('server:message', {
                  messageId: info.id,
                  message: info.content,
                  myUsername: info.user.username,
               })
            })
         }
      } catch (error) {
         console.log(error, 'ERROR_FETCHING_MESSAGES ❌')
      }
   }
})

app.use(morgan('dev'))
app.use(
   cors({
      credentials: true,
      origin: process.env.CLIENT_URL ?? '*',
   }),
)
app.use(express.json())
app.use(router)

httpServer.listen(process.env.PORT ?? 8000, () => console.log('RUNNING_ON_PORT:', process.env.PORT))
