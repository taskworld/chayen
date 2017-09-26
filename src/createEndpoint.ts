import * as EndpointServer from './endpointsServer'

const DEFAULT_TIMEOUT = 5000

export default async function createEndpoint ({ topic, schemas, handler, timeout = DEFAULT_TIMEOUT }) {
  await EndpointServer.setupServer()
  EndpointServer.addEndpoint({ topic, schemas, handler, timeout })
}
