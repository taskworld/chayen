import Bluebird from 'bluebird'
import Boom from 'boom'
import Joi from 'joi'
import bodyParser from 'body-parser'
import express from 'express'
import http from 'http'
import makeRequest, { MakeRequestParameters } from './makeRequest'

const app = express()

let server: null | http.Server = null

let handlerMap = new Map<String, Endpoint>()

export interface ServerOptions {}

export interface Address {
  port: number
  family: string
  address: string
}

export interface Endpoint {
  schema: Joi.Schema
  timeout: number
  handler (payload: any, delegator: Delegator): any
}

export async function setupServer (options?: ServerOptions): Promise<Address> {
  if (server) return server.address()

  app.use(bodyParser.json())

  app.post('/rpc', async (req, res) => {
    try {
      const result = await executeEndpoint({
        topic: req.body.topic,
        payload: req.body.payload
      })
      res.json({ payload: JSON.stringify(result) })
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

  const address = await new Promise<Address>(resolve => {
    server = app.listen(function () {
      const address = (server as http.Server).address()
      console.log(`RPC Setup on port ${address.port}!`)
      resolve(address)
    })
  })

  return address
}

const DEFAULT_TIMEOUT = 20000

export interface Delegator {
  makeDelegateRequestAsync (params: MakeRequestParameters): any
}

export interface EndpointParameters {
  topic: string
  schema: Joi.Schema
  timeout?: number
  opts?: { cache: false | { ttl: number } }
  handler (payload: any, delegator: Delegator): any
}

export function createEndpoint ({
  topic,
  schema,
  handler,
  timeout = DEFAULT_TIMEOUT,
  opts = { cache: false }
}: EndpointParameters) {
  if (handlerMap.has(topic)) throw new Error('endpoint already existed!')

  handlerMap.set(topic, { schema, handler, timeout })
}

export async function terminateServer () {
  if (!server) return
  await (server as any).close()
  handlerMap.clear()
  server = null
}

async function executeEndpoint ({ topic, payload }: { topic: string, payload: any }) {
  const endpoint = handlerMap.get(topic)
  if (!endpoint) throw Boom.badRequest('Invalid topic')

  const { schema, handler, timeout } = endpoint
  if (schema) {
    const v = Joi.validate(payload, schema)
    if (v.error) throw Boom.badData('Invalid schema: ', v.error.message)
    payload = v.value
  }

  try {
    const delegator = {
      makeDelegateRequestAsync: ({ topic, payload, target }: MakeRequestParameters) => {
        return makeRequest({ topic, payload, target })
      }
    }
    return Bluebird.try(() => handler(payload, delegator)).timeout(timeout)
  } catch (err) {
    if (err.name === 'TimeoutError') throw Boom.clientTimeout(err.message)
    throw err
  }
}
