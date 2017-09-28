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

test('Should throw on invalid schemas', async () => {
  createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      return payload.number + 1
    }
  })

  try {
    await makeRequest({
      topic: 'plus1',
      payload: {
        numberTypo: 2
      }
    })
    throw new Error('Should throw')
  } catch (err) {
    expect(err.statusCode).toBe(422)
    expect(err.message.startsWith('Invalid schemas')).toBe(true)
  }
})
