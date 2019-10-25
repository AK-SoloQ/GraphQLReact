// Express Modules
const express = require('express')
const bodyParser = require('body-parser')
// GraphQl Modules
const graphqlHttp = require('express-graphql')
const { buildSchema } = require('graphql')
// Mongoose ORM Modules
const mongoose = require('mongoose')
// Crypt Module
const bcrypt = require('bcryptjs')

// Models
const Event = require('./models/event')
const User = require('./models/user')

const app = express()

// middelware Body Parser
app.use(bodyParser.json())

const user = userId => {
  return User.findById(userId)
    .then(user => {
      return { ...user._doc, _id: user.id, createdEvents: events.bind(this, user._doc.createdEvents) }
    }).catch(err => {
      throw err
    })
}
const events = eventIds => {
  return Event.find({ _id: { $in: eventIds } })
    .then(events => {
      return events.map(event => {
        return { ...events._doc, _id: event.id, creator: user.bind(this, event.creator) }
      })
    }).catch(err => { throw err })
}

app.use('/graphql', graphqlHttp({
  schema: buildSchema(`
    type Event {
        _id: ID!
        title: String!
        description: String!
        price: Float!
        date: String!
        creator: User
    }

    type User {
        _id: ID!
        email: String!
        password: String
        createdEvents: [Event!]
    }

    input EventInput {
        title: String!
        description: String!
        price: Float!
        date: String!  
    }

    input UserInput {
        email: String!
        password: String!
    }

    type RootQuery {
        events:[Event!]!
    }

    type RootMutation {
        createEvent(eventInput : EventInput):Event
        createUser(userInput: UserInput): User
    }

    schema {
      query: RootQuery
      mutation: RootMutation
    }
  `),
  rootValue: {
    events: () => {
      return Event.find()
        .then(events => {
          return events.map(event => {
            return {
              ...event._doc,
              _id: event.id,
              creator: user.bind(this, event._doc.creator)
            }
          })
        }).catch(err => {
          throw err
        })
    },
    createEvent: (args) => {
      let resultEvent
      const event = new Event(
        { ...args.eventInput,
          creator: '5db16c9f2be2193f9656775b' })
      return event
        .save()
        .then(result => {
          resultEvent = { ...result._doc }
          return User.findById('5db16c9f2be2193f9656775b')
        })
        .then(user => {
          if (!user) {
            throw new Error('User existes already')
          }
          user.createdEvents.push(event)
          return user.save()
        }).then(result => {
          console.log({ result })
          return resultEvent
        })
        .catch(err => {
          console.log(err)
          throw err
        })
    },
    createUser: (args) => {
      let { email, password } = args.userInput
      return User.findOne({ email }).then(user => {
        if (user) {
          throw new Error('User exists already')
        }
        return bcrypt
          .hash(password, 12)
      }).then(hashPassword => {
        const user = new User({ email, password: hashPassword })
        return user.save()
      }).then(result => {
        console.log({ ...result._doc })
        return { ...result._doc, password: null, _id: result.id }
      })
        .catch(err => {
          throw err
        })
    }
  },
  graphiql: true
}))

app.get('/', (req, res, next) => {
  res.send('Hello World')
})

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-hfwmo.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`)
  .then(() => {
    console.log('Connection MongDB Server...')
    app.listen(8888, () => {
      console.log('Server is running in port 8888')
    })
  }).catch(err => {
    console.log('Connection fail MongoDB server', { err })
  })
