import {
  createEndpoint,
  setupServer,
  terminateServer
} from '../endpointsServer'

import Joi from 'joi'
import makeRequest from '../makeRequest'

beforeEach(async () => {
  await setupServer()
})

afterEach(async () => {
  await terminateServer()
})

test('Create endpoint and make request', async () => {
  createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      return payload.number + 1
    }
  })

  createEndpoint({
    topic: 'err',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      throw new Error('Force error')
    }
  })

  try {
    await makeRequest({
      topic: 'err',
      payload: {
        number: 2
      }
    })
  } catch (err) {
    expect(err.message).toBe('Force error')
  }
})
