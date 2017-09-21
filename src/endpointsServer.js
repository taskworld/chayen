const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const Joi = require('joi')
const Boom = require('boom')

let _start = false

const handlerMap = { }

function setupServer () {
  return new Promise(resolve => {
    if (!_start) {
      app.get('/', function (req, res) {
        res.send('Hello World!')
      })

      app.use(bodyParser.json())

      app.post('/rpc', async (req, res) => {
        try {
          const result = await executeEndpoint({
            topic: req.body.topic,
            payload: req.body.payload
          })
          res.json({
            payload: JSON.stringify(result)
          })
        } catch (err) {
          if (err.output && err.output.statusCode) {
            res.status(err.output.statusCode)
          } else {
            res.status(500)
          }
          res.send(err)
        }
      })

      app.listen(3000, function () {
        console.log('RPC Setup on port 3000!')
        resolve()
      })

      _start = true
    } else {
      resolve()
    }
  })
}

function addEndpoint ({ topic, schemas, handler }) {
  handlerMap[topic] = {
    schemas, handler
  }
}

async function executeEndpoint ({ topic, payload }) {
  const endpointData = handlerMap[topic]
  if (endpointData.schemas) {
    const v = Joi.validate(payload, endpointData.schemas)
    if (v.error) {
      throw Boom.badData('Invalid schemas: ', v.error.message)
    }
    payload = v.value
  }
  const result = await endpointData.handler({ payload })
  return result
}

module.exports.addEndpoint = addEndpoint
module.exports.setupServer = setupServer
