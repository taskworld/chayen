import Boom from 'boom'
import Joi from 'joi'
import P from 'bluebird'
import bodyParser from 'body-parser'
import express from 'express'

const app = express()
let _start = false

const handlerMap = {}

export async function setupServer () {
  if (_start) return

  app.get('/', function (req, res) {
    res.send('Hello World!')
  })

  app.use(bodyParser.json())

  app.post('/rpc', async (req, res) => {
    try {
      const result = await executeEndpoint({
        topic: req.body.topic,
        payload: req.body.payload
      })
      res.json({
        payload: JSON.stringify(result)
      })
    } catch (err) {
      if (err.output && err.output.statusCode) {
        // Boom Error
        res.status(err.output.statusCode)
        res.send(err)
      } else {
        // Unexpected error
        res.status(500)
        res.send({
          message: err.message,
          name: err.name
        })
      }
    }
  })

  await new P((resolve) => {
    app.listen(function (this: any) {
      const address = this.address()
      ;(global as any).HACK_PORT = address.port
      console.log(`RPC Setup on port ${address.port}!`)
      resolve()
    })
  })

  _start = true
}

export function addEndpoint ({ topic, schemas, handler, timeout }) {
  timeout = timeout || 20000
  handlerMap[topic] = {
    schemas, handler, timeout
  }
}

async function executeEndpoint ({ topic, payload }) {
  const endpointData = handlerMap[topic]
  const { schemas, handler, timeout } = endpointData
  if (schemas) {
    const v = Joi.validate(payload, schemas)
    if (v.error) {
      throw Boom.badData('Invalid schemas: ', v.error.message)
    }
    payload = v.value
  }
  let result
  try {
    result = await P.try(() => handler({ payload })).timeout(timeout)
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw Boom.clientTimeout(err.message)
    }
    throw err
  }
  return result
}
