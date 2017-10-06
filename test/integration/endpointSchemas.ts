import * as Joi from 'joi'

import * as Chayen from '../../dist'

test('Should throw on invalid schema', async () => {
  const server = new Chayen.Server()
  server.addEndpoint('test:plus1', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    }
  })
  await server.start()

  try {
    await Chayen.makeRequest(
      'test:plus1',
      { numberTypo: 2 },
      `http://localhost:${server.getAddress().port}/rpc`
    )
    throw new Error('Should throw')
  } catch (err) {
    expect(err.output.statusCode).toBe(422)
    expect(err.message.startsWith('Invalid schema')).toBe(true)
  } finally {
    await server.terminate()
  }
})

test('Should strip unknown field when validate schema', async () => {
  const server = new Chayen.Server()
  server.addEndpoint('test:plus1', {
    schema: Joi.object().keys({
      number: Joi.number().required()
    }),
    handler: async (payload) => {
      return payload.number + 1
    }
  })
  await server.start()

  const res = await Chayen.makeRequest(
    'test:plus1',
    { number: 2, unknown: 5555555 },
    `http://localhost:${server.getAddress().port}/rpc`
  )

  expect(res).toBe(3)

  await server.terminate()
})
