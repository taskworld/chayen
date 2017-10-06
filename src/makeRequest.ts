import axios from 'axios'
import * as Boom from 'boom'
import * as _ from 'lodash'

async function makeRequest (topic: string, payload: any, target: string) {
  return axios.post(target, { topic, payload })
    .then(response => response.data.payload)
    .catch(err => {
      const errData = _.get(err, 'response.data')
      if (errData) {
        throw Boom.create(
          _.get(errData, 'output.statusCode'),
          _.get(errData, 'output.payload.message')
        )
      }
      throw err
    })
}

export default makeRequest
