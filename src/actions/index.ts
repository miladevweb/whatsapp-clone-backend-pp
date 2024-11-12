import { db } from '../../prisma/db'

export async function createRoom(room: string, anotherUserId: string, myId: string) {
  await db.room.create({
    data: {
      name: room,
      users: { connect: [{ id: anotherUserId }, { id: myId }] },
    },
  })
}

export async function checkIfUserIsInRoom(anotherUserId: string, roomId: number) {
  await db.user.findFirst({
    where: {
      id: anotherUserId,
      rooms: { some: { id: roomId } },
    },
  })
  return true
}

export async function addUserToRoom(roomId: number, anotherUserId: string) {
  await db.room.update({
    where: { id: roomId },
    data: { users: { connect: { id: anotherUserId } } },
  })
}

export async function checkRoom(room: string) {
  return await db.room.findFirst({
    where: { name: room },
    select: {
      id: true,
    },
  })
}

export async function addMessageToRoom(content: string, roomId: number, myId: string) {
  return await db.message.create({
    data: {
      content,
      roomId,
      userId: myId,
    },
    select: { id: true },
  })
}

/* !socket.recovered */
export async function getMissingMessages(serverOffset: number, roomId: number) {
  return await db.message.findMany({
    where: { id: { gt: serverOffset ?? 0 }, roomId },
    select: {
      id: true,
      content: true,
      user: { select: { username: true } },
    },
  })
}

export async function getMessages(roomName: string, myUsername: string) {
  const messagesInfo = await db.message.findMany({
    where: { room: { name: roomName } },
    select: {
      id: true,
      content: true,
      user: { select: { username: true } },
    },
  })

  const anotherUser = await db.user.findFirst({
    where: {
      NOT: { username: myUsername },
      AND: { rooms: { some: { name: roomName } } },
    },
    select: {
      username: true,
      thumbnail: true,
    },
  })

  return {
    messages: messagesInfo.map((msg) => ({
      messageId: msg.id,
      content: msg.content,
      user: msg.user.username,
    })),
    username: anotherUser ? anotherUser.username : myUsername,
    thumbnail: anotherUser ? anotherUser.thumbnail : null,
  }
}

/* HTTP Queries */
export async function getFilteredUsers(searchedUser: string) {
  const users = await db.user.findMany({
    where: { username: { contains: searchedUser } },
    select: { id: true, username: true },
  })

  return users.map(({ id, username }) => ({ userId: id, userUsername: username }))
}

export async function getRoomNameByUsersIds(myId: string, anotherUserId: string) {
  return await db.room.findFirst({
    where: {
      AND: [
        {
          users: { some: { id: myId } },
        },
        {
          users: { some: { id: anotherUserId } },
        },
      ],
    },
    select: { name: true },
  })
}

export async function getUserInfo(username: string) {
  const userResponse = await db.user.findFirst({
    where: { username },
    select: {
      id: true,
      rooms: {
        take: 10,
        select: {
          name: true,
          users: {
            where: {
              NOT: { username },
            },
            select: { username: true },
          },
        },
      },
    },
  })
  if (!userResponse) return null
  const rooms = userResponse.rooms.map((r) => ({
    roomName: r.name,
    anotherUser: r.users.map((u) => u.username)[0] ?? username,
  }))
  return {
    rooms,
    userId: userResponse.id,
  }
}

export async function createUser(username: string, thumbnail: string) {
  const { id } = await db.user.create({
    data: { username, thumbnail },
    select: { id: true },
  })
  return { myId: id }
}

export async function getAnotherUserIdByRoomName(roomName: string, myId: string) {
  const response = await db.room.findFirst({
    where: {
      name: roomName,
    },
    select: {
      users: {
        where: { NOT: { id: myId } },
        select: {
          id: true,
        },
      },
    },
  })
  if (!response) return null
  const anotherUserId = response.users.map((user) => user.id)[0]
  return { anotherUserId }
}
