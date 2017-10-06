import * as fs from 'fs'
import * as path from 'path'

import * as Bluebird from 'bluebird'
import * as Joi from 'joi'

import * as Chayen from '../../dist'

const SERVER_CONFIG = { redisUrl: 'redis://127.0.0.1:6379' }

test('Should return response normally when redis is not available', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_1.txt')

  const endpointMapBuilder = new Chayen.EndpointMapBuilder()

  endpointMapBuilder.addEndpoint('test:cache:file:read:1', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cacheOption: { ttl: 10 }
  })

  const server = new Chayen.Server(endpointMapBuilder.getEndpointMap(), {
    redisUrl: 'redis://127.0.0.1:555555555'
  })
  await server.start()

  fs.writeFileSync(filePath, 'data')

  const res = await Chayen.makeRequest(
    'test:cache:file:read:1',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('data')

  await server.terminate()
})

test('Should return response normally when cache is not found and no limit specified', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_2.txt')

  const endpointMapBuilder = new Chayen.EndpointMapBuilder()

  endpointMapBuilder.addEndpoint('test:cache:file:read:2', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cacheOption: { ttl: 10 }
  })

  const server = new Chayen.Server(endpointMapBuilder.getEndpointMap(), SERVER_CONFIG)
  await server.start()

  fs.writeFileSync(filePath, 'data')

  const res = await Chayen.makeRequest(
    'test:cache:file:read:2',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('data')

  await server.terminate()
})

test('Should return cache when cache is available and no limit specified', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_3.txt')

  const endpointMapBuilder = new Chayen.EndpointMapBuilder()

  endpointMapBuilder.addEndpoint('test:cache:file:read:3', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cacheOption: { ttl: 10 }
  })

  const server = new Chayen.Server(endpointMapBuilder.getEndpointMap(), SERVER_CONFIG)
  await server.start()

  fs.writeFileSync(filePath, 'old_data')

  await Chayen.makeRequest(
    'test:cache:file:read:3',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'updated_data')

  const res = await Chayen.makeRequest(
    'test:cache:file:read:3',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('old_data')

  await server.terminate()
})

test('Should not return cache if cache expired and no limit specified', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_4.txt')

  const endpointMapBuilder = new Chayen.EndpointMapBuilder()

  endpointMapBuilder.addEndpoint('test:cache:file:read:4', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cacheOption: { ttl: 1 }
  })

  const server = new Chayen.Server(endpointMapBuilder.getEndpointMap(), SERVER_CONFIG)
  await server.start()

  fs.writeFileSync(filePath, 'old_data')

  await Chayen.makeRequest(
    'test:cache:file:read:4',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'updated_data')

  await Bluebird.delay(1100)

  const res = await Chayen.makeRequest(
    'test:cache:file:read:4',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe('updated_data')

  await server.terminate()
})
