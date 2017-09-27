import Joi from 'joi'
import P from 'bluebird'
import createEndpoint from '../createEndpoint'
import makeRequest from '../makeRequest'

test('Throw on timeout', async () => {
  await createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    timeout: 100,
    handler: async ({ payload }) => {
      await P.delay(103)
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
