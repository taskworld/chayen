import * as Joi from 'joi'

import * as Chayen from '../../dist'

test('Should delegate request correctly', async () => {
  const server = new Chayen.Server()

  server.addEndpoint('test:delegate:plus3', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload, delegator) => {
      const res = await delegator.makeDelegateRequestAsync(
        'test:delegate:plus2',
        payload,
        `http://localhost:${server.getAddress().port}/rpc`
      )
      return res + 1
    }
  })

  server.addEndpoint('test:delegate:plus2', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload, delegator) => {
      const first = await delegator.makeDelegateRequestAsync(
        'test:delegate:plus1',
        { number: payload.number },
        `http://localhost:${server.getAddress().port}/rpc`
      )
      const second = await delegator.makeDelegateRequestAsync(
        'test:delegate:plus1',
        { number: first },
        `http://localhost:${server.getAddress().port}/rpc`
      )
      return second
    }
  })

  server.addEndpoint('test:delegate:plus1', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    }
  })

  await server.start()

  const res = await Chayen.makeRequest(
    'test:delegate:plus3',
    { number: 2 },
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe(5)

  await server.terminate()
})
