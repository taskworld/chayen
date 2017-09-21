const EndpointServer = require('./endpointsServer')

async function createEndpoint ({ topic, schemas, handler }) {
  await EndpointServer.setupServer()
  EndpointServer.addEndpoint({ topic, schemas, handler })
}

module.exports = createEndpoint
