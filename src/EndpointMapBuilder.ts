import {
  Endpoint
} from './types'

export default class EndpointMapBuilder {
  private endpointMap: Map<string, Endpoint>

  constructor () {
    this.endpointMap = new Map<string, Endpoint>()
  }

  getEndpointMap () {
    return this.endpointMap
  }

  addEndpoint (topic: string, endpoint: Endpoint) {
    if (this.endpointMap.has(topic)) throw new Error('Endpoint already existed!')

    this.endpointMap.set(topic, endpoint)
  }
}
