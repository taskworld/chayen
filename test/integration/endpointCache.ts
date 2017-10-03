import * as fs from 'fs'
import * as path from 'path'

import * as Bluebird from 'bluebird'
import * as Joi from 'joi'

import {
  Server,
  makeRequest
} from '../../dist'

const SERVER_CONFIG = { redis: { host: 'localhost', port: 6379 } }

test('Should return response normally when redis is not available', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_1.txt')

  const server = new Server({ redis: { host: 'localhost', port: 555555555 } })
  server.addEndpoint('file:read:1', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 10 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'data')

  const res = await makeRequest({
    topic: 'file:read:1',
    payload: {},
    target: `http://localhost:${server.getAddress().port}/rpc`
  })

  expect(res).toBe('data')

  await server.terminate()
})

test('Should return response normally when cache is not found', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_2.txt')

  const server = new Server(SERVER_CONFIG)
  server.addEndpoint('file:read:2', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 10 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'data')

  const res = await makeRequest({
    topic: 'file:read:2',
    payload: {},
    target: `http://localhost:${server.getAddress().port}/rpc`
  })

  expect(res).toBe('data')

  await server.terminate()
})

test('Should return cache when cache is available', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_3.txt')

  const server = new Server(SERVER_CONFIG)
  server.addEndpoint('file:read:3', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 10 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'old_data')

  await makeRequest({
    topic: 'file:read:3',
    payload: {},
    target: `http://localhost:${server.getAddress().port}/rpc`
  })

  fs.writeFileSync(filePath, 'updated_data')

  const res = await makeRequest({
    topic: 'file:read:3',
    payload: {},
    target: `http://localhost:${server.getAddress().port}/rpc`
  })

  expect(res).toBe('old_data')

  await server.terminate()
})

test('Should not return cache if cache expired', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_4.txt')

  const server = new Server(SERVER_CONFIG)
  server.addEndpoint('file:read:4', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 1 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'old_data')

  await makeRequest({
    topic: 'file:read:4',
    payload: {},
    target: `http://localhost:${server.getAddress().port}/rpc`
  })

  fs.writeFileSync(filePath, 'updated_data')

  await Bluebird.delay(1100)

  const res = await makeRequest({
    topic: 'file:read:4',
    payload: {},
    target: `http://localhost:${server.getAddress().port}/rpc`
  })

  expect(res).toBe('updated_data')

  await server.terminate()
})
