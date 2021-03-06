
const {v4: uuid} = require('uuid')
const {merge} = require('mixme')
const microtime = require('microtime')
const level = require('level')
const db = level(__dirname + '/../db')

/****** Database access ******/
module.exports = {
  /********* CHANNELS *********/
  channels: {
    create: async (channel, ownerEmail, invitedUsers) => {
      if(!channel.name) throw Error('Invalid channel')
      if(!ownerEmail) throw Error('Invalid owner')
      const id = uuid()
      var owner = await module.exports.users.getByEmail(ownerEmail)
      channel.ownerId = owner.id
      if(!invitedUsers) {
        invitedUsers = [owner.id]
      } else {
        invitedUsers.push(owner.id)
      }
      channel = merge(channel, { idUsers: invitedUsers})
      uniqueUsers = [...new Set(channel.idUsers)]
      channel.idUsers = uniqueUsers
      await db.put(`channels:${id}`, JSON.stringify(channel))
      return merge(channel, {id: id})
    },
    get: async (id, userEmail) => {
      if(!id) throw Error('Invalid id')
      const data = await db.get(`channels:${id}`)
      const channel = JSON.parse(data)
      const user = await module.exports.users.getByEmail(userEmail)
      // Refuse the access if the user is not in the channel
      if(!channel.idUsers.includes(user.id)) throw Error('Unauthorized')
      return merge(channel, {id: id})
    },
    list: async () => {
      return new Promise( (resolve, reject) => {
        const channels = []
        db.createReadStream({
          gt: "channels:",
          lte: "channels" + String.fromCharCode(":".charCodeAt(0) + 1),
        }).on( 'data', ({key, value}) => {
          channel = JSON.parse(value)
          channel.id = key.split(':')[1]
          channels.push(channel)
        }).on( 'error', (err) => {
          reject(err)
        }).on( 'end', () => {
          resolve(channels)
        })
      })
    },
    listChannelOfUser: async (userEmail) => {
      const user = await module.exports.users.getByEmail(userEmail)
      var channels = []
      if(user.channels) {
        for(const elem  of user.channels) {
          channels.push(await module.exports.channels.get(elem, userEmail))
        }
      }
      return channels
    },
    invite: async (id, listUsers, userRequesting) => {
      const data = await db.get(`channels:${id}`)
      if(!data) throw Error('Unregistered channel id')
      var channel = JSON.parse(data)
      listUsers.invitedUsers.forEach(elem => {
        channel.idUsers.push(elem)
      })
      const user = await module.exports.users.getByEmail(userRequesting.email)
      if(!channel.idUsers.includes(user.id)) throw Error('Unauthorized')
      await db.put(`channels:${id}`, JSON.stringify(channel))
      return channel
    },
  },
  /********* MESSAGES *********/
  messages: {
    create: async (channelId, req) => {
      if(!channelId) throw Error('Invalid channel')
      if(!req.body.content) throw Error('Invalid message')
      if(!req.user.email) throw Error('Invalid user')
      const userData = await db.get(`channels:${channelId}`)
      const channel = JSON.parse(userData)
      const user = await module.exports.users.getByEmail(req.user.email)
      // Refuse the access if the user is not in the channel
      if(!channel.idUsers.includes(user.id)) throw Error('Unauthorized')
      creation = microtime.now()
      const author = await module.exports.users.getByEmail(req.user.email)
      await db.put(`messages:${channelId}:${creation}`, JSON.stringify({
        authorId: author.id,
        author: author.username,
        content: req.body.content,
      }))
      return merge(req.body, {creation: creation})
    },
    get: async (channelId, creation, userEmail) => {
      if(!channelId) throw Error('Invalid channel id')
      if(!creation) throw Error('Invalid message id')
      if(!userEmail) throw Error('Invalid user')
      const userData = await db.get(`channels:${channelId}`)
      const channel = JSON.parse(userData)
      const user = await module.exports.users.getByEmail(userEmail)
      // Refuse the access if the user is not in the channel
      if(!channel.idUsers.includes(user.id)) throw Error('Unauthorized')
      const data = await db.get(`messages:${channelId}:${creation}`)
      const message = JSON.parse(data)
      return merge(message, {creation: creation})
    },
    // List messages of a channel
    list: async (channelId, userEmail) => {
      if(!channelId) throw Error('Invalid id')
      if(!userEmail) throw Error('Invalid user')
      const data = await db.get(`channels:${channelId}`)
      const channel = JSON.parse(data)
      const user = await module.exports.users.getByEmail(userEmail)
      // Refuse the access if the user is not in the channel
      if(!channel.idUsers.includes(user.id)) throw Error('Unauthorized')
      else return new Promise( (resolve, reject) => {
        const messages = []
        db.createReadStream({
          gt: `messages:${channelId}:`,
          lte: `messages:${channelId}` + String.fromCharCode(":".charCodeAt(0) + 1),
        }).on( 'data', ({key, value}) => {
          message = JSON.parse(value)
          const [, channelId, creation] = key.split(':')
          message.channelId = channelId
          message.creation = creation
          messages.push(message)
        }).on( 'error', (err) => {
          reject(err)
        }).on( 'end', () => {
          resolve(messages)
        })
      })
    },
    // Update a message
    update: async (channelId, creation, req) => {
      if(!channelId) throw Error('Invalid channel')
      if(!creation) throw Error('Invalid message')
      if(!req.user.email) throw Error('Invalid user')
      const idRequester = (await module.exports.users.getByEmail(req.user.email)).id
      var message = await module.exports.messages.get(channelId, creation, req.user.email)
      if (message.authorId == idRequester) {
        message.content = req.body.content
        await db.put(`messages:${channelId}:${creation}`, JSON.stringify(message))
        return message
      }
      else throw Error('Unauthorized')
    },
    // Delete a message
    delete: async (channelId, creation, req) => {
      if(!channelId) throw Error('Invalid channel')
      if(!creation) throw Error('Invalid message')
      if(!req.user.email) throw Error('Invalid user')
      const idRequester = (await module.exports.users.getByEmail(req.user.email)).id
      const message = await module.exports.messages.get(channelId, creation, req.user.email)
      if (message.authorId == idRequester) {
        await db.del(`messages:${channelId}:${creation}`)
        return { success: true }
      }
      else throw Error('Unauthorized')
    },
  },
  /********* USERS *********/
  users: {
    create: async (user) => {
      try {
        // No username's duplicate
        if(!user.username || !user.email || await module.exports.users.getByUsername(user.username) || await module.exports.users.getByEmail(user.email)) {
          throw Error('Invalid user')
        }
        const id = uuid()
        await db.put(`users:${id}`, JSON.stringify(user))
        await db.put(`usernames:${user.username}`, JSON.stringify({id: id}))
        await db.put(`userEmails:${user.email}`, JSON.stringify({id: id}))
        return merge(user, {id: id})
      } catch (error) {
        console.log("error in create user")
        return null
      }
    },
    get: async (id) => {
      try {
        if(!id) throw Error('Invalid id')
        const data = await db.get(`users:${id}`)
        const user = JSON.parse(data)
        return merge(user, {id: id})
      } catch (error) {
        return null
      }
    },
    // Get a user with their email
    getByEmail: async (email) => {
      try {
        if(!email) throw Error('Invalid email')
        var userId = await db.get(`userEmails:${email}`)
        userId = JSON.parse(userId)
        return await module.exports.users.get(userId.id)
      } catch (error) {
        return null
      }
    },
    // Get a user with their username
    getByUsername: async (username) => {
      try {
        if(!username) throw Error('Invalid username')
        var userId = await db.get(`usernames:${username}`)
        userId = JSON.parse(userId)
        return module.exports.users.get(userId.id)
      } catch {
        return null
      }
    },
    list: async () => {
      return new Promise( (resolve, reject) => {
        const users = []
        db.createReadStream({
          gt: "users:",
          lte: "users" + String.fromCharCode(":".charCodeAt(0) + 1),
        }).on( 'data', ({key, value}) => {
          user = JSON.parse(value)
          user.id = key.split(':')[1]
          users.push(user)
        }).on( 'error', (err) => {
          reject(err)
        }).on( 'end', () => {
          resolve(users)
        })
      })
    },
    // List the users' usernames
    listNames: async () => {
      return new Promise( (resolve, reject) => {
        const users = []
        db.createReadStream({
          gt: "usernames:",
          lte: "usernames" + String.fromCharCode(":".charCodeAt(0) + 1),
        }).on( 'data', ({key, value}) => {
          user = JSON.parse(value)
          user.username = key.split(':')[1]
          users.push(user)
        }).on( 'error', (err) => {
          reject(err)
        }).on( 'end', () => {
          resolve(users)
        })
      })
    },
    // List the 10 users with the closer username to what is given
    searchByName: async (nameStart) => {
      return new Promise( (resolve, reject) => {
        const users = []
        db.createReadStream({
          gte: "usernames:" + nameStart,
          lt: "usernames:" + String.fromCharCode(nameStart.charCodeAt(0) + 1),
          limit: 10,
        }).on( 'data', ({key, value}) => {
          user = JSON.parse(value)
          user.username = key.split(':')[1]
          users.push(user)
        }).on( 'error', (err) => {
          reject(err)
        }).on( 'end', () => {
          resolve(users)
        })
      })
    },
    // Invite a user to a channel
    invite: async (id, idChannel) => {
      if(!id) throw Error('Missing user id')
      if(!idChannel) throw Error('Missing channel id')
      const data = await db.get(`users:${id}`)
      if(!data) throw Error('Unregistered channel id')
      var original = JSON.parse(data)
      if(original.channels) {
        original.channels.push(idChannel)
        uniqueChannels = [...new Set(original.channels)]
        original.channels = uniqueChannels
      }
      else {
        original.channels = [ idChannel ]
      }
      await db.put(`users:${id}`, JSON.stringify(original))
      return original
    },
  },
  admin: {
    clear: async () => {
      await db.clear()
    }
  }
}
