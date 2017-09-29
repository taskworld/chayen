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

test('Should return response normally when redis instance is not available', async () => {
  const address = await setupServer({ redis: { host: 'localhost', port: 6379999999 } })

  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache.txt')

  fs.writeFileSync(filePath, 'data')

  createEndpoint({
    topic: 'file:read',
    schemas: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    opts: {
      cache: { ttl: 10 }
    }
  })

  const res = await makeRequest({
    topic: 'file:read',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res).toBe('data')

  await terminateServer()
})

test('Should return cache when cache has not been out of date', async () => {
  const address = await setupServer({ redis: { host: 'localhost', port: 6379 } })

  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache.txt')

  fs.writeFileSync(filePath, 'old_data')

  createEndpoint({
    topic: 'file:read',
    schemas: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    opts: {
      cache: { ttl: 10 }
    }
  })

  const res = await makeRequest({
    topic: 'file:read',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res).toBe('old_data')

  fs.writeFileSync(filePath, 'updated_data')

  const res2 = await makeRequest({
    topic: 'file:read',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res2).toBe('old_data')

  await terminateServer()
})

test('Should not return cache if cache expired', async () => {
  const address = await setupServer({ redis: { host: 'localhost', port: 6379 } })

  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache.txt')

  fs.writeFileSync(filePath, 'old_data')

  createEndpoint({
    topic: 'file:read',
    schemas: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    opts: {
      cache: { ttl: 1 }
    }
  })

  const res = await makeRequest({
    topic: 'file:read',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res).toBe('old_data')

  fs.writeFileSync(filePath, 'updated_data')

  await Bluebird.delay(1500)

  const res2 = await makeRequest({
    topic: 'file:read',
    payload: {},
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res2).toBe('updated_data')

  await terminateServer()
})
