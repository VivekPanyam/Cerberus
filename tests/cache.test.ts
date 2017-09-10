import {interceptCreateServer, makeHTTPRequest, mockExampleBackend} from "./test-utils"

const expectedResponse = mockExampleBackend({delay: 500})
const requestHandler = interceptCreateServer()

import "../examples/cache"

test("checks that caching reduces latency and produces expect output", function() {
  const request  = {
      method: "GET",
      url: "/",
      connection: {
          remoteAddress: "127.0.0.1",
      },
  }

  return requestHandler.then(function(routeHandler) {
      return makeHTTPRequest(routeHandler, request).then(function(response) {
        expect(response.data).toBe(expectedResponse)
        expect(response.latency).toBeGreaterThan(500)
      }).then(function() {
        // Make the request again
        return makeHTTPRequest(routeHandler, request)
      }).then(function(response) {
        expect(response.data).toBe(expectedResponse)
        expect(response.latency).toBeLessThan(50)
      })
  })
})
