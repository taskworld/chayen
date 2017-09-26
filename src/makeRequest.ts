import * as _ from 'lodash'
import * as request from 'superagent'

async function makeRequest({ topic, payload, target = `http://localhost:${global.HACK_PORT}/rpc` }) {
  try {
    const result = await request.post(target).send({
      topic,
      payload
    })
    const jsonResponse = JSON.parse(result.text)
    const jsonPayload = JSON.parse(jsonResponse.payload)
    return jsonPayload
  } catch (err) {
    if (err.response && err.response.text) {
      const errData = JSON.parse(err.response.text)
      const boomError = _.get(errData, 'output.payload')
      if (boomError) {
        throw boomError
      } else {
        throw new Error(errData.message)
      }
    } else {
      throw err
    }
  }
}

export default makeRequest
