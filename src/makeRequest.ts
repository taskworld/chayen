import axios from 'axios'
import * as _ from 'lodash'

export interface MakeRequestParameters {
  topic: string
  payload: any
  target: string
}

async function makeRequest ({ topic, payload, target }: MakeRequestParameters) {
  try {
    const response = await axios.post(target, {
      topic,
      payload
    })
    return JSON.parse(response.data.payload)
  } catch (err) {
    if (err.response && err.response.data) {
      const errData = err.response.data
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
