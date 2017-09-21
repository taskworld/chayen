const EndpointServer = require('./endpointsServer')

async function createEndpoint ({ topic, schemas, handler, timeout }) {
  await EndpointServer.setupServer()
  EndpointServer.addEndpoint({ topic, schemas, handler, timeout })
}

module.exports = createEndpoint
