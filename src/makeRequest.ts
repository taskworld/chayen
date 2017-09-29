import _ from 'lodash'
import request from 'superagent'

export interface MakeRequestParameters {
  topic: string
  payload: any
  target: string
}

async function makeRequest ({ topic, payload, target }: MakeRequestParameters) {
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
