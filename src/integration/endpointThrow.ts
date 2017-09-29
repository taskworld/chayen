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

test('Should throw error when there is an error', async () => {
  createEndpoint({
    topic: 'err',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      throw new Error('Force error')
    }
  })

  try {
    await makeRequest({
      topic: 'err',
      payload: {
        number: 2
      },
      target: `http://localhost:${address.port}/rpc`
    })
  } catch (err) {
    expect(err.message).toBe('Force error')
  }
})
