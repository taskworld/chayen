const Joi = require('joi')
const createEndpoint = require('../createEndpoint')

createEndpoint({
  topic: 'plus2',
  schemas: Joi.object().keys({
    number: Joi.number().required()
  }),
  handler: async ({ payload }) => {
    return payload.number + 2
  }
}).then(c => console.log('ENDPOINT CREATE'))
