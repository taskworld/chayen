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

test('Pass metadata', async () => {
  createEndpoint({
    topic: 'plus3',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      const res = await makeRequest({
        topic: 'plus2',
        payload: payload
      })
      return res + 1
    }
  })
  createEndpoint({
    topic: 'plus2',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      const first = await makeRequest({ topic: 'plus1', payload: { number: payload.number } })
      const second = await makeRequest({ topic: 'plus1', payload: { number: first } })
      return second
    }
  })
  createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      return payload.number + 1
    }
  })
  const res = await makeRequest({
    topic: 'plus3',
    payload: {
      number: 2
    }
  })
  await makeRequest({
    topic: 'plus1',
    payload: {
      number: 1
    }
  })

  expect(res).toBe(5)
})
