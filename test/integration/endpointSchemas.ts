import Joi from 'joi'

import {
  Server,
  makeRequest
} from '../../src'

test('Should throw on invalid schema', async () => {
  const server = new Server()
  server.addEndpoint('plus1', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    }
  })
  await server.start()

  try {
    await makeRequest({
      topic: 'plus1',
      payload: {
        numberTypo: 2
      },
      target: `http://localhost:${server.getAddress().port}/rpc`
    })
    throw new Error('Should throw')
  } catch (err) {
    expect(err.statusCode).toBe(422)
    expect(err.message.startsWith('Invalid schema')).toBe(true)
  } finally {
    await server.terminate()
  }
})
