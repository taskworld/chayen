import * as EndpointServer from './endpointsServer'

export default async function createEndpoint ({ topic, schemas, handler, timeout }) {
  await EndpointServer.setupServer()
  EndpointServer.addEndpoint({ topic, schemas, handler, timeout })
}
