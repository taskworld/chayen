import {
  createEndpoint,
  setupServer,
  terminateServer
} from '../endpointsServer'
import makeRequest from '../makeRequest'

import Bluebird from 'Bluebird'
import fs from 'fs'
import Joi from 'joi'
import path from 'path'

const REDIS_SERVER_CONFIG = { redis: { host: 'localhost', port: 6379 } }

afterEach(async () => {
  await terminateServer()
})

test('Should return response normally when redis is not available', async () => {
  const address = await setupServer({ redis: { host: 'localhost', port: 555555555 } })

  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_1.txt')

  fs.writeFileSync(filePath, 'data')

  createEndpoint({
    topic: 'file:read:1',
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    opts: {
      cache: { ttl: 10 }
    }
  })

  const res = await makeRequest({
    topic: 'file:read:1',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res).toBe('data')
})

test('Should return response normally when cache is not found', async () => {
  const address = await setupServer(REDIS_SERVER_CONFIG)

  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_2.txt')

  fs.writeFileSync(filePath, 'old_data')

  createEndpoint({
    topic: 'file:read:2',
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    opts: {
      cache: { ttl: 10 }
    }
  })

  const res = await makeRequest({
    topic: 'file:read:2',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res).toBe('old_data')
})

test('Should return cache when cache is available', async () => {
  const address = await setupServer(REDIS_SERVER_CONFIG)

  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_3.txt')

  fs.writeFileSync(filePath, 'old_data')

  createEndpoint({
    topic: 'file:read:3',
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    opts: {
      cache: { ttl: 10 }
    }
  })

  const res = await makeRequest({
    topic: 'file:read:3',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  fs.writeFileSync(filePath, 'updated_data')

  const res2 = await makeRequest({
    topic: 'file:read:3',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res2).toBe('old_data')
})

test('Should not return cache if cache expired', async () => {
  const address = await setupServer(REDIS_SERVER_CONFIG)

  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_4.txt')

  fs.writeFileSync(filePath, 'old_data')

  createEndpoint({
    topic: 'file:read:4',
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    opts: {
      cache: { ttl: 1 }
    }
  })

  const res = await makeRequest({
    topic: 'file:read:4',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  fs.writeFileSync(filePath, 'updated_data')

  await Bluebird.delay(1100)

  const res2 = await makeRequest({
    topic: 'file:read:4',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res2).toBe('updated_data')
})
