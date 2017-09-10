import {expectHTTPResponses, expectWSResponses, interceptCreateServer, interceptWebsocketServer} from "./test-utils"
let httpRequestHandler: any = interceptCreateServer()
let wsConnectionHandler: any = interceptWebsocketServer()

import "../examples/acl"

test("checks that access control behaves correctly", function() {
  return Promise.all([httpRequestHandler, wsConnectionHandler]).then(function(handlers) {
    httpRequestHandler = handlers[0]
    wsConnectionHandler = handlers[1]

    const baseRequest  = {
        method: "GET",
        url: "/",
        connection: {
            remoteAddress: "127.0.0.1",
        },
    }

    const VALID_SIGNED_TOKEN = "s:1.qPEYVkKbyvn8uCzA6HIjhK8xxgSPswKFJuGSGmWD0iA"

    const httpTests = [
      {
        url: "/?token=" + VALID_SIGNED_TOKEN + "&color=green",
        expectedResponse: JSON.stringify({success: true, body: {user: "1", data: "green"}}),
      },
      {
        url: "/?color=blue",
        expectedResponse: JSON.stringify({success: true, body: {user: null, data: "blue"}}),
      },
      {
        url: "/?token=invalid&color=green",
        expectedResponse: JSON.stringify({error: "Please login to set your color to green!"}),
      },
    ]

    const wsTests = [
      {
        url: "/?token=invalid",
        messages: [
          {
            req: JSON.stringify({color: "blue"}),
            expectedResponse: JSON.stringify({success: true, body: {user: null, data: "blue"}}),
          },
          {
            req: JSON.stringify({color: "red"}),
            expectedResponse: JSON.stringify({success: true, body: {user: null, data: "red"}}),
          },
        ],
      },
      {
        url: "/?token=" + VALID_SIGNED_TOKEN,
        messages: [
          {
            req: JSON.stringify({color: "blue"}),
            expectedResponse: JSON.stringify({success: true, body: {user: "1", data: "blue"}}),
          },
          {
            req: JSON.stringify({color: "green"}),
            expectedResponse: JSON.stringify({success: true, body: {user: "1", data: "green"}}),
          },
        ],
      },
      {
        url: "/?token=invalid",
        messages: [
          {
            req: JSON.stringify({color: "red"}),
            expectedResponse: JSON.stringify({success: true, body: {user: null, data: "red"}}),
          },
          {
            req: JSON.stringify({color: "yellow"}),
            expectedResponse: JSON.stringify({success: true, body: {user: null, data: "yellow"}}),
          },
          {
            req: JSON.stringify({color: "green"}),
            expectedResponse: JSON.stringify({error: "Please login to set your color to green!"}),
          },
          {
            req: JSON.stringify({color: "blue"}),
            expectedResponse: JSON.stringify({success: true, body: {user: null, data: "blue"}}),
          },
        ],
      },
    ]


    return Promise.all([
      expectHTTPResponses(httpRequestHandler, baseRequest, httpTests),
      expectWSResponses(wsConnectionHandler, baseRequest, wsTests),
    ]).then(function() {
      // The next request should hit the rate limit
      return expectHTTPResponses(httpRequestHandler, baseRequest, [{
        url: "/",
        expectedResponse: JSON.stringify({error: "Rate limit hit"}),
      }])
    })
  })
})
