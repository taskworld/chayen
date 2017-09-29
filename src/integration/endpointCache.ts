import {
  createEndpoint,
  setupServer,
  terminateServer
} from '../endpointsServer'

import Joi from 'joi'
import makeRequest from '../makeRequest'

let address

beforeEach(async () => {
  address = await setupServer({ redis: { host: 'localhost', port: 6379 } })
})

afterEach(async () => {
  await terminateServer()
})

test.only('Should return response normally when cache hasn\'t been saved', async () => {
  createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    },
    opts: {
      cache: { ttl: 60 }
    }
  })

  const res = await makeRequest({
    topic: 'plus1',
    payload: {
      number: 2
    },
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res).toBe(3)
})

test('Should return response normally when redis instance is not available', () => {
  //
})

test('Should return cache within ttl time', () => {
  //
})

test('Shouldn\'t return cache if cache expired', () => {
  //
})
