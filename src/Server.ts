import * as http from 'http'

import * as Bluebird from 'bluebird'
import * as bodyParser from 'body-parser'
import * as Boom from 'boom'
import * as express from 'express'
import * as Redis from 'ioredis'
import * as Joi from 'joi'
import * as hash from 'object-hash'

import makeRequest from './makeRequest'

const DEFAULT_TIMEOUT = 20000

export interface ServerConfigs {
  port?: number
  redis?: RedisServerConfig
}

export interface RedisServerConfig {
  host: string
  port: number
  options?: Redis.RedisOptions
}

export interface Endpoint {
  schema: Joi.Schema
  timeout?: number
  cache?: { ttl: number }
  handler (payload: any, delegator: Delegator): any
}

export interface Delegator {
  makeDelegateRequestAsync (topic: string, payload: any, target: string): any
}

export default class Server {
  private app: express.Express
  private redis: Redis.Redis
  private port: number
  private endpoints: Map<string, Endpoint>
  private server: http.Server

  constructor (configs: ServerConfigs = {}) {
    this.app = express()
    this.app.use(bodyParser.json())
    this.app.post('/rpc', async (req, res) => {
      try {
        const result = await this.executeEndpoint(req.body.topic, req.body.payload)
        res.json({ payload: result })
      } catch (err) {
        const boomError = Boom.boomify(err, { override: false })
        res.status(boomError.output.statusCode)
        res.send(boomError)
      }
    })

    if (configs.redis) {
      this.redis = new Redis(configs.redis)
    }

    if (configs.port) {
      this.port = configs.port
    }

    this.endpoints = new Map<string, Endpoint>()
  }

  getAddress () {
    if (!this.server) throw new Error('Server is not start yet')
    return this.server.address()
  }

  addEndpoint (topic: string, endpoint: Endpoint) {
    if (this.endpoints.has(topic)) throw new Error('Endpoint already existed!')

    this.endpoints.set(topic, endpoint)
  }

  async start () {
    if (this.server) return null

    return new Promise<http.Server>(resolve => {
      const serverCallback = function (this) {
        const address = this.address()
        console.log(`RPC Setup on port ${address.port}!`)
        resolve(this)
      }
      this.server = this.port
        ? this.app.listen(this.port, serverCallback)
        : this.app.listen(serverCallback)
    })
  }

  async terminate () {
    if (!this.server) return
    this.server.close()
    if (this.redis) {
      try {
        await this.redis.quit()
      } catch (error) {
        console.error('Can not quit Redis.', error)
      }
    }
    delete this.server
  }

  private async executeEndpoint (topic: string, payload: object) {
    const endpoint = this.endpoints.get(topic)

    if (!endpoint) throw Boom.badRequest('Invalid topic')

    if (endpoint.schema) {
      const v = Joi.validate(payload, endpoint.schema, { stripUnknown: true })
      if (v.error) throw Boom.badData('Invalid schema: ', v.error.message)
      payload = v.value
    }

    if (this.redis && endpoint.cache) {
      try {
        const cache = await this.redis.get(_getCacheKey(topic, payload))
        if (cache) return JSON.parse(cache).v
      } catch (err) {
        console.error(err)
      }
    }

    let result
    try {
      const delegator = {
        makeDelegateRequestAsync: (topic: string, payload: any, target: string) => {
          return makeRequest(topic, payload, target)
        }
      }
      result = await Bluebird
        .try(() => endpoint.handler(payload, delegator))
        .timeout(endpoint.timeout || DEFAULT_TIMEOUT)
    } catch (err) {
      if (err.name === 'TimeoutError') throw Boom.clientTimeout(err.message)
      throw err
    }

    if (this.redis && endpoint.cache) {
      try {
        const key = _getCacheKey(topic, payload)
        const value = JSON.stringify({ v: result })
        await this.redis.set([key, value, 'EX', endpoint.cache.ttl])
      } catch (err) {
        console.error(err)
      }
    }

    return result
  }
}

function _getCacheKey (topic: string, payload: any) {
  return `${process.env.NODE_ENV}::chayen::cache::${topic}::${hash({topic, payload})}`
}
