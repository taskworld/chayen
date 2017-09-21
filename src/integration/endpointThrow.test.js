const { assert } = require('chai')
const createEndpoint = require('../createEndpoint')
const makeRequest = require('../makeRequest')

describe('endpoint Throw', () => {
  it('Create endpoint and make request', async () => {
    await createEndpoint({
      topic: 'plus1',
      handler: async ({ payload }) => {
        return payload.number + 1
      }
    })

    await createEndpoint({
      topic: 'err',
      handler: async ({ payload }) => {
        throw new Error('Force error')
      }
    })

    try {
      await makeRequest({
        topic: 'err',
        payload: {
          number: 2
        }
      })
    } catch (err) {
      assert(err.message === 'Force error')
    }
  })
})
