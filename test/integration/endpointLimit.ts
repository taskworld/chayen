import * as fs from 'fs'
import * as path from 'path'

import * as Bluebird from 'bluebird'
import * as Joi from 'joi'

import * as Chayen from '../../dist'

const SERVER_CONFIG = { redisUrl: 'redis://127.0.0.1:6379' }

test('Should return response normally when redis is not available', async () => {
  const server = new Chayen.Server({ redisUrl: 'redis://127.0.0.1:555555555' })
  server.addEndpoint('test', {
    schema: Joi.object().keys({}),
    handler: () => 1
  })
  await server.start()

  const res = await Chayen.makeRequest(
    'test',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe(1)

  await server.terminate()
})

test('Should return cache when cache is available and no limit specified', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_1.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('test:file:read:1', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 10 }
  })
  await server.start()

  const makeRequestToFileRead1 = async () => Chayen.makeRequest(
    'file:read:1',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'old_data')

  await makeRequestToFileRead1()

  fs.writeFileSync(filePath, 'updated_data')

  const res = await makeRequestToFileRead1()

  expect(res).toBe('old_data')

  await server.terminate()
})

test('Should not return cache if cache expired and no limit specified', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_2.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('file:read:2', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 1 }
  })
  await server.start()

  const makeRequestToFileRead2 = async () => Chayen.makeRequest(
    'file:read:2',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'old_data')

  await makeRequestToFileRead2()

  fs.writeFileSync(filePath, 'updated_data')

  await Bluebird.delay(1100)

  const res = await makeRequestToFileRead2()

  expect(res).toBe('updated_data')

  await server.terminate()
})

test('Should return normal response when request not exceed limit', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_3.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('file:read:3', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 5, limit: 5 }
  })
  await server.start()

  const makeRequestToFileRead3 = async () => Chayen.makeRequest(
    'file:read:3',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'old_data')

  await makeRequestToFileRead3()
  await makeRequestToFileRead3()

  fs.writeFileSync(filePath, 'updated_data')

  const res = await makeRequestToFileRead3()

  expect(res).toBe('updated_data')

  await server.terminate()
})

test('Should return cache if request exceed limit', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_4.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('file:read:4', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 5, limit: 3 }
  })
  await server.start()

  const makeRequestToFileRead4 = async () => Chayen.makeRequest(
    'file:read:4',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'old_data')

  await makeRequestToFileRead4()
  await makeRequestToFileRead4()

  fs.writeFileSync(filePath, 'updated_data')

  const res = await makeRequestToFileRead4()

  expect(res).toBe('old_data')

  await server.terminate()
})

test('Should return normal response after cache expire', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_cache_5.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('file:read:5', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cache: { ttl: 1, limit: 2 }
  })
  await server.start()

  const makeRequestToFileRead5 = async () => Chayen.makeRequest(
    'file:read:5',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'data1')

  await makeRequestToFileRead5()
  await makeRequestToFileRead5()

  Bluebird.delay(1000)

  fs.writeFileSync(filePath, 'data2')

  const res = await makeRequestToFileRead5()

  expect(res).toBe('data2')

  await server.terminate()
})
