import * as EndpointsServer from '../endpointsServer'

import Joi from 'joi'
import createEndpoint from '../createEndpoint'
import makeRequest from '../makeRequest'

beforeEach(async () => {
  await EndpointsServer.setupServer()
})

afterEach(async () => {
  await EndpointsServer.terminate()
})

test('Create endpoint and make request', async () => {
  await createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      return payload.number + 1
    }
  })

  await createEndpoint({
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
