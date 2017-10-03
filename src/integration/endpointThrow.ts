import Boom from 'boom'
import Joi from 'joi'

import makeRequest from '../makeRequest'
import Server from '../Server'

test('Should hide message and respond with 500 if server error', async () => {
  const server = new Server()
  server.addEndpoint('err', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      throw new Error('Force error')
    }
  })
  await server.start()

  try {
    await makeRequest({
      topic: 'err',
      payload: {
        number: 2
      },
      target: `http://localhost:${server.getAddress().port}/rpc`
    })
  } catch (err) {
    expect(err.statusCode).toBe(500)
    expect(err.message).toBe('An internal server error occurred')
  } finally {
    await server.terminate()
  }
})

test('Should not hide boom error throw by handler', async () => {
  const server = new Server()
  server.addEndpoint('err', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      throw Boom.conflict('There is a conflict')
    }
  })
  await server.start()

  try {
    await makeRequest({
      topic: 'err',
      payload: {
        number: 2
      },
      target: `http://localhost:${server.getAddress().port}/rpc`
    })
  } catch (err) {
    expect(err.statusCode).toBe(409)
    expect(err.message).toBe('There is a conflict')
  } finally {
    await server.terminate()
  }
})
