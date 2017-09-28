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

test('Should throw error', async () => {
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
