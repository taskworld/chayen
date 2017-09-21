const Promise = require('bluebird')
const { assert } = require('chai')
const createEndpoint = require('../createEndpoint')
const makeRequest = require('../makeRequest')
const Joi = require('joi')

describe('Endpoint timeout', () => {
  it('Throw on timeout', (done) => {
    const run = async () => {
      await createEndpoint({
        topic: 'plus1',
        schemas: Joi.object().keys({
          number: Joi.number().required()
        }),
        timeout: 100,
        handler: async ({ payload }) => {
          await Promise.delay(103)
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
        done(new Error('Should timeout'))
      } catch (err) {
        assert(err.statusCode === 408)
        assert(err.error === 'Request Time-out')
        done()
      }
    }
    run()
  })
})
