import * as Joi from 'joi'

export interface ServerConfig {
  port?: number
  redis?: {
    redisUrl: string,
    sentinelMasterName?: string
  }
}

export interface CacheOption {
  ttl: number
  limit?: number
}

export interface Endpoint {
  schema: Joi.Schema
  timeout?: number
  cacheOption?: CacheOption | false
  handler (payload: any, delegator: Delegator): any
}

export interface Delegator {
  makeDelegateRequestAsync (topic: string, payload: any, target: string): any
}
