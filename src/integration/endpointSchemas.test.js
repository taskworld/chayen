const { assert } = require('chai')
const createEndpoint = require('../../build/createEndpoint').default
const makeRequest = require('../../build/makeRequest').default
const Joi = require('joi')

describe('Schemas validation', () => {
  it('Throw on invalid schemas', (done) => {
    const run = async () => {
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
        done(new Error('Should throw'))
      } catch (err) {
        assert(err.statusCode === 422)
        assert(err.message.startsWith('Invalid schemas'))
        done()
      }
    }
    run()
  })
})
