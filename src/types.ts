import * as Joi from 'joi'

export interface ServerConfigs {
  port?: number
  redisUrl?: string
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
