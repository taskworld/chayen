import Bluebird from 'bluebird'
import Joi from 'joi'

import makeRequest from '../makeRequest'
import Server from '../Server'

test('Should throw on timeout', async () => {
  const server = new Server()
  server.addEndpoint('plus1', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    timeout: 100,
    handler: async (payload) => {
      await Bluebird.delay(103)
      return payload.number + 1
    }
  })
  await server.start()

  try {
    await makeRequest({
      topic: 'plus1',
      payload: {
        number: 2
      },
      target: `http://localhost:${server.getAddress().port}/rpc`
    })
    throw new Error('Should timeout')
  } catch (err) {
    expect(err.statusCode).toBe(408)
    expect(err.error).toBe('Request Time-out')
  } finally {
    server.terminate()
  }
})
