const WebSocket = require('ws')
const fs = require('fs')
const authKey = ''
const account = ''
const wsUrl = 'ws://api.batorange.com:11001/ws' 

const reconnect = {
  'code': 100,
  'authKey': authKey,
  'data': {}
}

const login = {
  'code': 101,
  'authKey': authKey,
  'data': {'account': account}
}

export let botWs
const connect = function() {
  botWs = new WebSocket(wsUrl, { perMessageDeflate: true })
  botWs.on('open', function open() {
    try {
      botWs.send(JSON.stringify(reconnect))
      botWs.send(JSON.stringify(login))
    } catch (error) {
      throw (error)
    }
  })
  
  botWs.on('message', async function incoming(data) {
    console.log(data)
  })
  
  botWs.on('error', function Error(error) {
    throw Error(error)
  })
  
  botWs.on('close', function close(err) {
    console.log('============= detect close =============')
  })
}

try {
  connect()
} catch (error) {
  throw(error)
}