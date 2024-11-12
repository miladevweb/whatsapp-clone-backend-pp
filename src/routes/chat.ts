import { Router } from 'express'
import { createUser, getAnotherUserIdByRoomName, getFilteredUsers, getMessages, getRoomNameByUsersIds, getUserInfo } from '../actions'

const router = Router()

/* Get Info of all Rooms */
router.get('/credentials/:username', async (req, res) => {
  const { username } = req.params
  try {
    const userInfo = await getUserInfo(username)
    if (!userInfo) return res.status(404).json({ message: 'User not found' })
    return res.status(200).json(userInfo)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error })
  }
})

/* Create User */
router.post('/chat', async (req, res) => {
  const { username, thumbnail } = req.body
  try {
    const response = await createUser(username, thumbnail)
    return res.status(201).json(response)
  } catch (error) {
    console.log(error, 'CREATE_USER_ERROR ❌')
    return res.status(500).json({ message: error })
  }
})

router.get('/chat', async (req, res) => {
  const { searchedUser } = req.query as { searchedUser: string | undefined }

  if (!searchedUser || searchedUser.length < 3) return res.status(400).json({ message: 'Search must be at least 3 characters ❌' })

  try {
    const users = await getFilteredUsers(searchedUser)
    if (users.length === 0) return res.status(404).json({ message: 'USER_NOT_FOUND ❌' })
    return res.status(200).json(users)
  } catch (error) {
    console.log(error, 'SEARCHED_USER_ERROR ❌')
    return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR ❌' })
  }
})

router.get('/roomInfo', async (req, res) => {
  const { roomName, myId } = req.query as { [key: string]: string }
  if (!roomName) return res.status(400).json({ message: 'Missing required fields' })
  try {
    const anotherUserId = await getAnotherUserIdByRoomName(roomName, myId)
    if (!anotherUserId) return res.status(404).json({ message: 'ROOM_NOT_FOUND ❌' })
    return res.json(anotherUserId)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR ❌' })
  }
})
router.get('/room', async (req, res) => {
  const { myId, anotherUserId } = req.query as { [key: string]: string }
  if (!myId || !anotherUserId) return res.status(400).json({ message: 'Missing required fields ' })

  try {
    const room = await getRoomNameByUsersIds(myId, anotherUserId)
    if (!room) return res.status(404).json({ message: 'ROOM_NOT_FOUND ❌' })
    return res.status(200).json({ roomName: room.name })
  } catch (error) {
    console.log(error, 'SEARCHED_ROOM_ERROR ❌')
    return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR ❌' })
  }
})

router.get('/messages/:roomName/:myUsername', async (req, res) => {
  const { roomName, myUsername } = req.params
  try {
    const response = await getMessages(roomName, myUsername)
    return res.status(200).json(response)
  } catch (error) {
    console.log(error, 'GET_MESSAGES_ERROR ❌')
    return res.status(500).json({ message: 'INTERNAL_SERVER_ERROR ❌' })
  }
})

export { router }
