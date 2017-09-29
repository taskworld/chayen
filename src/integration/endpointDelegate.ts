import {
  createEndpoint,
  setupServer,
  terminateServer
} from '../endpointsServer'

import Joi from 'joi'
import makeRequest from '../makeRequest'

let address

beforeEach(async () => {
  address = await setupServer()
})

afterEach(async () => {
  await terminateServer()
})

test('Should delegate request correctly', async () => {
  createEndpoint({
    topic: 'plus3',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload, delegator) => {
      const res = await delegator.makeDelegateRequestAsync({
        topic: 'plus2',
        payload: payload,
        target: `http://localhost:${address.port}/rpc`
      })
      return res + 1
    }
  })

  createEndpoint({
    topic: 'plus2',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload, delegator) => {
      const first = await delegator.makeDelegateRequestAsync({
        topic: 'plus1',
        payload: { number: payload.number },
        target: `http://localhost:${address.port}/rpc`
      })
      const second = await delegator.makeDelegateRequestAsync({
        topic: 'plus1',
        payload: { number: first },
        target: `http://localhost:${address.port}/rpc`
      })
      return second
    }
  })

  createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    }
  })

  const res = await makeRequest({
    topic: 'plus3',
    payload: {
      number: 2
    },
    target: `http://localhost:${address.port}/rpc`
  })

  expect(res).toBe(5)
})
