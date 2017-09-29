import {
  createEndpoint,
  setupServer,
  terminateServer
} from '../endpointsServer'

import Bluebird from 'bluebird'
import Joi from 'joi'
import makeRequest from '../makeRequest'

beforeEach(async () => {
  await setupServer()
})

afterEach(async () => {
  await terminateServer()
})

test('Should throw on timeout', async () => {
  createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    timeout: 100,
    handler: async ({ payload }) => {
      await Bluebird.delay(103)
      return payload.number + 1
    }
  })

  try {
    await makeRequest({
      topic: 'plus1',
      payload: {
        number: 2
      }
    })
    throw new Error('Should timeout')
  } catch (err) {
    expect(err.statusCode).toBe(408)
    expect(err.error).toBe('Request Time-out')
  }
})
