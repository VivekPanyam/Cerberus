// tslint:disable-next-line
const http = require("http")
import nock = require("nock")
import ws = require("ws")

const realCreateServer = http.createServer
const realWebsocketServer = ws.Server

// Returns a promise that resolves to the handler passed to createServer
export function interceptCreateServer() {
  return new Promise(function(resolve, reject) {
    // Intercept calls to createServer
    http.createServer = function(handler) {
      // Reset createServer
      http.createServer = realCreateServer

      return {
        listen(port, callback) {
          if (callback) {
            callback()
          }

          resolve(handler)
        },
      }
    }
  })
}

export function interceptWebsocketServer() {
  return new Promise(function(resolve, reject) {
    ws.Server = function() {
      return {
        on(event, callback) {
          if (event === "connection") {
            resolve(callback)
          }
        },
      }
    }
  })
}

export function makeWSConnection(wsHandler, upgradeReq?: object): Promise<any> {
  return new Promise(function(resolve, reject) {
    if (!upgradeReq) {
      upgradeReq = {
        headers: [],
        url: "/",
        connection: {
          remoteAddress: "127.0.0.1",
        },
      }
    }

    const toReturn = {
      messages: [],
      isClosed: false,
      sendMessage: null,
    }

    let onResponseHandler = null

    const mockConnection = {
      upgradeReq,
      close() {
        toReturn.isClosed = true
      },
      on(event, callback) {
        if (event === "message") {
          toReturn.sendMessage = function(message) {
            return new Promise(function(resolveSend, rejectSend) {
              onResponseHandler = resolveSend
              callback(message)
            })
          }
          resolve(toReturn)
        } else if (event === "close") {
          // Ignore this for now
        }
      },
      send(message) {
        if (toReturn.isClosed) {
          throw new Error("Trying to send message when the connection is closed")
        }

        if (onResponseHandler) {
          onResponseHandler(message)
          onResponseHandler = null
        }

        toReturn.messages.push(message)
      },
    }

    wsHandler(mockConnection)
  })
}

export function makeHTTPRequest(routeHandler, request): Promise<any> {
  return new Promise(function(resolve, reject) {
    const startTime = Date.now()
    const response = {
      end(data) {
        const endTime = Date.now()
        resolve({data, latency: endTime - startTime})
      },
    }

    routeHandler(request, response)
  })
}

interface IHTTPTestSpec {
  url: string
  expectedResponse: string
}

export function expectHTTPResponses(httpRequestHandler, baseRequest: object, tests: IHTTPTestSpec[]) {
  return Promise.all(tests.map((testSpec) => {
    return makeHTTPRequest(httpRequestHandler, {...baseRequest, ...{url: testSpec.url}}).then(function(response) {
      expect(response.data).toBe(testSpec.expectedResponse)
    })
  }))
}

interface IWSTestMessage {
  req: string,
  expectedResponse: string
}

interface IWSTestSpec {
  url: string,
  messages: IWSTestMessage[]
}

export function expectWSResponses(wsConnectionHandler, baseRequest: object, tests: IWSTestSpec[]) {
  return Promise.all(tests.map((testSpec) => {
    return makeWSConnection(wsConnectionHandler, {...baseRequest, ...{url: testSpec.url}}).then(function(channel) {
      let previous = Promise.resolve()
      // Loop over messages to send
      testSpec.messages.forEach(function(messageSpec) {
        previous = previous.then(function() {
          return channel.sendMessage(messageSpec.req)
        }).then(function(response) {
          expect(response).toBe(messageSpec.expectedResponse)
          return "" // So TypeScript doesn't complain
        })
      })

      return previous
    })
  }))
}

export function mockExampleBackend(options?: any) {
  options = options || {}
  let scope = nock("http://example.com").persist().get("/")

  if (options.delay) {
    scope = scope.delayBody(options.delay)
  }

  // Sample data
  let responseData = {
    sample: "JSON",
  }

  if (options.responseData != null) {
    responseData = options.responseData
  }

  scope.reply(200, responseData)

  return JSON.stringify(responseData)
}
