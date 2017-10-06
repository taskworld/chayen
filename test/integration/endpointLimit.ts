import * as fs from 'fs'
import * as path from 'path'

import * as Bluebird from 'bluebird'
import * as Joi from 'joi'

import * as Chayen from '../../dist'

const SERVER_CONFIG = { redisUrl: 'redis://127.0.0.1:6379' }

test('Should return normal response when request not exceed limit', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_limit_1.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('test:limit:file:read:1', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cacheOption: { ttl: 5, limit: 3 }
  })
  await server.start()

  const makeRequestToFileRead1 = async () => Chayen.makeRequest(
    'test:limit:file:read:1',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'old_data')

  await makeRequestToFileRead1()
  await makeRequestToFileRead1()

  fs.writeFileSync(filePath, 'updated_data')

  const res = await makeRequestToFileRead1()

  expect(res).toBe('updated_data')

  await server.terminate()
})

test('Should return cache if request exceed limit', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_limit_2.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('test:limit:file:read:2', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cacheOption: { ttl: 5, limit: 2 }
  })
  await server.start()

  const makeRequestToFileRead2 = async () => Chayen.makeRequest(
    'test:limit:file:read:2',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'old_data')

  await makeRequestToFileRead2()
  await makeRequestToFileRead2()

  fs.writeFileSync(filePath, 'updated_data')

  const res = await makeRequestToFileRead2()

  expect(res).toBe('old_data')

  await server.terminate()
})

test('Should return normal response limit window has ended', async () => {
  const filePath = path.join(__dirname, 'TEST_FILES', 'test_limit_3.txt')

  const server = new Chayen.Server(SERVER_CONFIG)
  server.addEndpoint('test:limit:file:read:3', {
    schema: Joi.object().keys({}),
    handler: async () => {
      return fs.readFileSync(filePath, 'utf8')
    },
    cacheOption: { ttl: 1, limit: 2 }
  })
  await server.start()

  const makeRequestToFileRead3 = async () => Chayen.makeRequest(
    'test:limit:file:read:3',
    {},
    `http://localhost:${server.getAddress().port}/rpc`
  )

  fs.writeFileSync(filePath, 'data1')

  await makeRequestToFileRead3()
  await makeRequestToFileRead3()

  await Bluebird.delay(1000)

  fs.writeFileSync(filePath, 'data2')

  const res = await makeRequestToFileRead3()

  expect(res).toBe('data2')

  await server.terminate()
})
