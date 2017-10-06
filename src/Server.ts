import * as http from 'http'

import * as Bluebird from 'bluebird'
import * as Boom from 'boom'
import * as Redis from 'ioredis'
import * as Joi from 'joi'
import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import * as hash from 'object-hash'

import makeRequest from './makeRequest'
import {
  CacheOption,
  Endpoint,
  ServerConfigs
} from './types'

const DEFAULT_TIMEOUT = 20000

export default class Server {
  private app: Koa
  private router: Router
  private redis: Redis.Redis
  private port: number
  private endpoints: Map<string, Endpoint>
  private server: http.Server

  constructor (configs: ServerConfigs = {}) {
    this.app = new Koa()
    this.app.use(bodyParser({
      enableTypes: [ 'json' ]
    }))

    this.router = new Router()
    this.router.post('/rpc', async ctx => {
      try {
        const result = await this.executeEndpoint(ctx.request.body.topic, ctx.request.body.payload)
        ctx.body = { payload: result }
      } catch (err) {
        const boomError = Boom.boomify(err, { override: false })
        ctx.status = boomError.output.statusCode
        ctx.body = boomError
      }
    })

    this.app.use(this.router.routes())

    if (configs.redisUrl) {
      this.redis = new Redis(configs.redisUrl)
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
    if (this.redis) {
      try {
        await this.redis.quit()
      } catch (error) {
        console.error('Can not quit Redis.', error)
      }
    }
    this.server.close()
    delete this.server
  }

  private async shouldReturnCache (cacheOption: CacheOption | false | undefined, cacheKey: string) {
    if (!this.redis || !cacheOption) return false

    if (!cacheOption.limit) return true

    try {
      const cacheCount = await this.redis.incr(`${cacheKey}::count`)
      if (cacheCount === 1) {
        await this.redis.expire(`${cacheKey}::count`, cacheOption.ttl)
      }
      return cacheCount > cacheOption.limit
    } catch (err) {
      console.error(err)
    }
    return false
  }

  private async executeEndpoint (topic: string, payload: object) {
    const endpoint = this.endpoints.get(topic)

    if (!endpoint) throw Boom.badRequest('Invalid topic')

    if (endpoint.schema) {
      const v = Joi.validate(payload, endpoint.schema, { stripUnknown: true })
      if (v.error) throw Boom.badData('Invalid schema: ', v.error.message)
      payload = v.value
    }

    const cacheKey = _getCacheKey(topic, payload)
    if (await this.shouldReturnCache(endpoint.cacheOption, cacheKey)) {
      try {
        const cache = await this.redis.get(cacheKey)
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

    if (this.redis && endpoint.cacheOption) {
      try {
        const value = JSON.stringify({ v: result })
        await this.redis.set([cacheKey, value, 'EX', endpoint.cacheOption.ttl])
      } catch (err) {
        console.error(err)
      }
    }

    return result
  }
}

function _getCacheKey (topic: string, payload: any) {
  return `${process.env.NODE_ENV}::chayen::cache::${topic}::${hash({ topic, payload })}`
}
