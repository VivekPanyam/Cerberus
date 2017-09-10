import {expectHTTPResponses, interceptCreateServer, mockExampleBackend} from "./test-utils"

const expectedResponse = mockExampleBackend()
const requestHandler = interceptCreateServer()

import "../examples/rate-limit"

test("checks that HMAC authentation works properly", function() {
  const request  = {
      method: "GET",
      url: "/",
      connection: {
          remoteAddress: "127.0.0.1",
      },
  }

  return requestHandler.then(function(routeHandler) {
    return expectHTTPResponses(routeHandler, request, [{
      url: "/",
      expectedResponse,
    }, {
      url: "/",
      expectedResponse: JSON.stringify({error: "Rate limit hit"}),
    }])
  })
})
