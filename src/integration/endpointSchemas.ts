import createEndpoint from '../createEndpoint'
import makeRequest from '../makeRequest'
import * as Joi from 'joi'

test('Throw on invalid schemas', async () => {
  await createEndpoint({
    topic: 'plus1',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      return payload.number + 1
    }
  })
  await createEndpoint({
    topic: 'plus2',
    schemas: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async ({ payload }) => {
      return payload.number + 2
    }
  })
  try {
    await makeRequest({
      topic: 'plus1',
      payload: {
        numberTypo: 2
      }
    })
    throw new Error('Should throw')
  } catch (err) {
    expect(err.statusCode).toBe(422)
    expect(err.message.startsWith('Invalid schemas')).toBe(true)
  }
})
