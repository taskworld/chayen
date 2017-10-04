import * as Bluebird from 'bluebird'
import * as Joi from 'joi'

import Chayen from '../../dist'

test('Should throw on timeout', async () => {
  const server = new Chayen.Server()
  server.addEndpoint('test:timeout:plus1', {
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
    await Chayen.makeRequest(
      'test:timeout:plus1', { number: 2 },
      `http://localhost:${server.getAddress().port}/rpc`
    )
    throw new Error('Should timeout')
  } catch (err) {
    expect(err.statusCode).toBe(408)
    expect(err.error).toBe('Request Time-out')
  } finally {
    await server.terminate()
  }
})
