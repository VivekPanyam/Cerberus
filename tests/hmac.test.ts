import {expectHTTPResponses, interceptCreateServer, mockExampleBackend} from "./test-utils"

const expectedResponse = mockExampleBackend()
const requestHandler = interceptCreateServer()

import "../examples/hmac"

test("checks that HMAC authentation works properly", function() {
  const baseRequest  = {
      method: "GET",
      url: "/",
      connection: {
          remoteAddress: "127.0.0.1",
      },
  }

  return requestHandler.then(function(routeHandler) {
    return expectHTTPResponses(routeHandler, baseRequest, [{
      url: "/",
      expectedResponse: JSON.stringify({error: "Invalid Authentication Token"}),
    }, {
      url: "/?token=s:1.THISISINVALID",
      expectedResponse: JSON.stringify({error: "Invalid Authentication Token"}),
    }, {
      url: "/?token=s:1.qPEYVkKbyvn8uCzA6HIjhK8xxgSPswKFJuGSGmWD0iA",
      expectedResponse,
    }])
  })
})
