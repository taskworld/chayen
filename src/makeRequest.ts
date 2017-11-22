import axios from 'axios'
import * as Boom from 'boom'
import * as jaeger from 'jaeger-client'
import * as _ from 'lodash'
import * as opentracing from 'opentracing'

const config = {
  serviceName: 'chayen',
  sampler: {
    type: 'const',
    param: 1,
    host: 'localhost',
    port: 5775,
    refreshIntervalMs: 500
  },
  reporter: {
    flushIntervalMs: 500
  }
}

const options = {
  tags: {
    service_version: '1.0.0' // could be sent from the caller?
  }
}

async function makeRequest (topic: string, payload: any, target: string, headers?: any) {
  const tracer = jaeger.initTracer(config, options) as opentracing.Tracer
  let span
  if (headers) {
    const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, headers)
    span = tracer.startSpan(topic, { childOf: wireCtx as opentracing.SpanContext })
  } else {
    span = tracer.startSpan(topic)
  }
  const carrier = {}
  tracer.inject(span.context(), opentracing.FORMAT_HTTP_HEADERS, carrier)
  return axios.post(target, { topic, payload }, { headers: carrier })
    .then(response => {
      span.finish()
      return response.data.payload
    })
    .catch(err => {
      const errData = _.get(err, 'response.data')
      if (errData) {
        throw Boom.create(
          _.get(errData, 'output.statusCode'),
          _.get(errData, 'output.payload.message')
        )
      }
      span.addTags({ error: true })
      span.finish()
      throw err
    })
}

export default makeRequest
