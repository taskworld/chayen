import * as EndpointsServer from '../endpointsServer'

import Joi from 'joi'
import createEndpoint from '../createEndpoint'
import makeRequest from '../makeRequest'

beforeEach(async () => {
  console.log('start')
  await EndpointsServer.setupServer()
})

afterEach(async () => {
  console.log('terminate')
  await EndpointsServer.terminate()
})

test('Sanity', async () => {
  expect(1 + 1).toBe(2)
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
    topic: 'plus2',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      return payload.number + 2
    }
  })

  const result1 = await makeRequest({
    topic: 'plus1',
    payload: {
      number: 2
    }
  })

  const result2 = await makeRequest({
    topic: 'plus2',
    payload: {
      number: 2
    }
  })

  expect(result1).toBe(3)
  expect(result2).toBe(4)
})
