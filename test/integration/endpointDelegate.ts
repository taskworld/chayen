import Joi from 'joi'

import {
  Server,
  makeRequest
} from '../../src'

test('Should delegate request correctly', async () => {
  const server = new Server()

  server.addEndpoint('plus3', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload, delegator) => {
      const res = await delegator.makeDelegateRequestAsync({
        topic: 'plus2',
        payload: payload,
        target: `http://localhost:${server.getAddress().port}/rpc`
      })
      return res + 1
    }
  })

  server.addEndpoint('plus2', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload, delegator) => {
      const first = await delegator.makeDelegateRequestAsync({
        topic: 'plus1',
        payload: { number: payload.number },
        target: `http://localhost:${server.getAddress().port}/rpc`
      })
      const second = await delegator.makeDelegateRequestAsync({
        topic: 'plus1',
        payload: { number: first },
        target: `http://localhost:${server.getAddress().port}/rpc`
      })
      return second
    }
  })

  server.addEndpoint('plus1', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    }
  })

  await server.start()

  const res = await makeRequest({
    topic: 'plus3',
    payload: {
      number: 2
    },
    target: `http://localhost:${server.getAddress().port}/rpc`
  })

  expect(res).toBe(5)

  await server.terminate()
})
