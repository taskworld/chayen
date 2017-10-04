import * as fs from 'fs'
import * as path from 'path'

import * as Bluebird from 'bluebird'
import * as Joi from 'joi'

import Chayen from '../../dist'

const SERVER_CONFIG = { redisUrl: 'redis://127.0.0.1:6379' }

test('Should return response normally when redis is not available', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_1.txt')

  const server = new Chayen.Server({ redisUrl: 'redis://127.0.0.1:555555555' })
  server.addEndpoint('test:file:read:1', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 10 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'data')

  const res = await Chayen.makeRequest(
    'test:file:read:1',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('data')

  await server.terminate()
})

test('Should return response normally when cache is not found', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_2.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('test:file:read:2', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 10 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'data')

  const res = await Chayen.makeRequest(
    'test:file:read:2',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('data')

  await server.terminate()
})

test('Should return cache when cache is available', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_3.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('test:file:read:3', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 10 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'old_data')

  await Chayen.makeRequest(
    'test:file:read:3',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'updated_data')

  const res = await Chayen.makeRequest(
    'test:file:read:3',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('old_data')

  await server.terminate()
})

test('Should not return cache if cache expired', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_4.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('file:read:4', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 1 }
  })
  await server.start()

  fs.writeFileSync(filePath, 'old_data')

  await Chayen.makeRequest(
    'file:read:4',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'updated_data')

  await Bluebird.delay(1100)

  const res = await Chayen.makeRequest(
    'file:read:4',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('updated_data')

  await server.terminate()
})
