import * as http from 'http'

import * as Bluebird from 'bluebird'
import * as Boom from 'boom'
import * as Redis from 'ioredis'
import * as Joi from 'joi'
import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import * as Router from 'koa-router'
import * as hash from 'object-hash'

import createRedisClient from './createRedisClient'
import makeRequest from './makeRequest'
import {
  CacheOption,
  Endpoint,
  ServerConfig
} from './types'

const DEFAULT_TIMEOUT = 20000

export default class Server {
  private app: Koa
  private router: Router
  private redis: Redis.Redis
  private port: number
  private endpointMap: Map<string, Endpoint>
  private server: http.Server

  constructor (endpointMap: Map<string, Endpoint>, config: ServerConfig = {}) {
    this.app = new Koa()
    this.app.use(bodyParser({
      enableTypes: [ 'json' ]
    }))

    this.router = new Router()
    this.router.post('/rpc', async ctx => {
      try {
        const result = await this.executeEndpoint(ctx.request.body.topic, ctx.request.body.payload, ctx.headers)
        ctx.body = { payload: result }
      } catch (err) {
        const boomError = Boom.boomify(err, { override: false })
        ctx.status = boomError.output.statusCode
        ctx.body = boomError
      }
    })

    this.app.use(this.router.routes())

    if (config.redis) {
      this.redis = createRedisClient(config.redis.redisUrl, config.redis.sentinelMasterName)
    }

    if (config.port) {
      this.port = config.port
    }

    this.endpointMap = endpointMap
  }

  getAddress () {
    if (!this.server) throw new Error('Server is not start yet')
    return this.server.address()
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

  private async executeEndpoint (topic: string, payload: object, headers?: object) {
    const endpoint = this.endpointMap.get(topic)

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
          return makeRequest(topic, payload, target, headers)
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
