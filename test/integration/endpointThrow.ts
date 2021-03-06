import * as Boom from 'boom'
import * as Joi from 'joi'

import * as Chayen from '../../dist'

test('Should hide message and respond with 500 if server error', async () => {
  const endpointMapBuilder = new Chayen.EndpointMapBuilder()

  endpointMapBuilder.addEndpoint('test:throw:error', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      throw new Error('Force error')
    }
  })

  const server = new Chayen.Server(endpointMapBuilder.getEndpointMap())
  await server.start()

  try {
    await Chayen.makeRequest(
      'test:throw:error',
      { number: 2 },
      `http://localhost:${server.getAddress().port}/rpc`
    )
    throw new Error('Should reject this')
  } catch (err) {
    expect(err.output.statusCode).toBe(500)
    expect(err.message).toBe('An internal server error occurred')
  } finally {
    await server.terminate()
  }
})

test('Should not hide boom error throw by handler', async () => {
  const endpointMapBuilder = new Chayen.EndpointMapBuilder()

  endpointMapBuilder.addEndpoint('test:throw:boom', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      throw Boom.conflict('There is a conflict')
    }
  })

  const server = new Chayen.Server(endpointMapBuilder.getEndpointMap())
  await server.start()

  try {
    await Chayen.makeRequest(
      'test:throw:boom',
      { number: 2 },
      `http://localhost:${server.getAddress().port}/rpc`
    )
    throw new Error('Should reject this')
  } catch (err) {
    expect(err.output.statusCode).toBe(409)
    expect(err.message).toBe('There is a conflict')
  } finally {
    await server.terminate()
  }
})
