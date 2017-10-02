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

test('Should throw on invalid schema', async () => {
  createEndpoint({
    topic: 'plus1',
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    }
  })

  try {
    await makeRequest({
      topic: 'plus1',
      payload: {
        numberTypo: 2
      },
      target: `http://localhost:${address.port}/rpc`
    })
    throw new Error('Should throw')
  } catch (err) {
    expect(err.statusCode).toBe(422)
    expect(err.message.startsWith('Invalid schema')).toBe(true)
  }
})
