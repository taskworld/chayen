import axios from 'axios'
import * as _ from 'lodash'

async function makeRequest (topic: string, payload: any, target: string) {
  try {
    const response = await axios.post(target, {
      topic,
      payload
    })
    return response.data.payload
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
