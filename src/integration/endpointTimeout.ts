import * as EndpointsServer from '../endpointsServer'

import Bluebird from 'bluebird'
import Joi from 'joi'
import createEndpoint from '../createEndpoint'
import makeRequest from '../makeRequest'

beforeEach(async () => {
  await EndpointsServer.setupServer()
})

afterEach(async () => {
  await EndpointsServer.terminate()
})

test('Throw on timeout', async () => {
  await createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    timeout: 100,
    handler: async ({ payload }) => {
      // TODO: remove tslint-disable after create custom rule for bluebird promise
      await Bluebird.delay(103) // tslint:disable-line:await-promise
      return payload.number + 1
    }
  })
  try {
    await makeRequest({
      topic: 'plus1',
      payload: {
        number: 2
      }
    })
    throw new Error('Should timeout')
  } catch (err) {
    expect(err.statusCode).toBe(408)
    expect(err.error).toBe('Request Time-out')
  }
})
