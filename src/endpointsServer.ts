import Bluebird from 'bluebird'
import Boom from 'boom'
import Joi from 'joi'
import bodyParser from 'body-parser'
import express from 'express'
import makeRequest from './makeRequest'

const app = express()

let server = null

const handlerMap = {}

export async function setupServer (cacheClient = null) {
  if (server) return

  app.use(bodyParser.json())

  app.post('/rpc', async (req, res) => {
    try {
      const result = await executeEndpoint({
        topic: req.body.topic,
        payload: req.body.payload,
        metadata: req.body.metadata || []
      })
      res.json({
        payload: JSON.stringify(result)
      })
    } catch (err) {
      if (err.isBoom) {
        res.status(err.output.statusCode)
        res.send(err)
      } else {
        res.status(500)
        res.send({
          message: err.message,
          name: err.name
        })
      }
    }
  })

  const address = await new Promise((resolve) => {
    server = app.listen(function (this: any) {
      const address = this.address()
      console.log(`RPC Setup on port ${address.port}!`)
      resolve(address)
    })
  })

  return address
}

const DEFAULT_TIMEOUT = 20000

export function createEndpoint ({ topic, schemas, handler, timeout = DEFAULT_TIMEOUT }) {
  if (handlerMap[topic]) throw new Error('endpoint already existed!')

  handlerMap[topic] = { schemas, handler, timeout }
}

export async function terminateServer () {
  if (!server) return
  await (server as any).close()
  server = null
}

async function executeEndpoint ({ topic, payload, metadata }) {
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
    const delegator = {
      makeDelegateRequestAsync: ({ topic, payload, target }) => {
        metadata.push({ topic, timestamp: new Date().getTime() })
        return makeRequest({ topic, payload, metadata, target })
      }
    }
    result = await Bluebird.try(() => handler({ payload }, delegator)).timeout(timeout)
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw Boom.clientTimeout(err.message)
    }
    throw err
  }
  return result
}
