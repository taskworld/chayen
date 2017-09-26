const { expect } = require('chai')
const createEndpoint = require('../../build/createEndpoint').default
const makeRequest = require('../../build/makeRequest').default

describe('Integration', () => {
  it('Sanity', async () => {
    expect(1 + 1).to.equal(2)
  })

  it('Create endpoint and make request', async () => {
    await createEndpoint({
      topic: 'plus1',
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

    const result1 = await makeRequest({
      topic: 'plus1',
      payload: {
        number: 2
      }
    })

    const result2 = await makeRequest({
      topic: 'plus2',
      payload: {
        number: 2
      }
    })

    expect(result1).to.equal(3)
    expect(result2).to.equal(4)
  })
})
