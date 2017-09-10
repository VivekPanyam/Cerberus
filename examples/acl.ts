import {Cerberus, CerberusRequest, EventType} from "../cerberus"
const WSFrontend = Cerberus.Frontends.WSFrontend
const HTTPFrontend = Cerberus.Frontends.HTTPFrontend
const HMACAuthenticator = Cerberus.Plugins.HMACAuthenticator
const RateLimit = Cerberus.Plugins.RateLimit
const HTTPBackend = Cerberus.Backends.HTTPBackend

const c = new Cerberus()

// Add a Websocket frontend
c.addFrontend(new WSFrontend(8080))

// Add a HTTP frontend
// `location.query` is what we want to store
c.addFrontend(new HTTPFrontend(8081, false, (httpReq, location) => location.query))

// Validate that all connections contain a query parameter named "token" that is
// signed with a specific key. This is compatible with signed cookies from Express
// (https://github.com/expressjs/cookie-parser)
// When the authenticator receives a `CerberusRequest` object, it sets the `userID`
// field in the request if the token is valid
//
// The last parameter tells the authenticator to allow requests that
// don't have a signed token (instead of responding with an error).
// Unsigned requests won't have a valid `userID`
// See the HMACAuthenticator documentation for more options
//
// Tip: "s:1.qPEYVkKbyvn8uCzA6HIjhK8xxgSPswKFJuGSGmWD0iA" is a valid signed token
c.addPlugin(new HMACAuthenticator("SUPER_SECRET_HMAC_KEY", "token", false))

// Limit all calls to 11 requests per second per IP address
// (See acl.test.js for why we do this)
c.addPlugin(new RateLimit(11, 1000, () => true))

// Don't allow unauthenticated requests where "color" is set to "green"
c.on(EventType.REQUEST, function(request: CerberusRequest) {
  // userID is not set unless the connection has a signed token
  if (!request.connection.userID) {
    if (request.data.color === "green") {
      return "Please login to set your color to green!"
    }
  }
})

// Set the backend
// Makes a POST request to an internal host
c.setBackend(new HTTPBackend((req) => ({
    url: "https://some-internal-host:4032",
    method: "POST",
    json: {
        user: req.connection.userID,
        data: req.data.color,
    },
})))

// Mock requests to `https://some-internal-host:4032`
import nock = require("nock")
nock("https://some-internal-host:4032").persist().post("/").reply(function(url, requestBody) {
  return {success: true, body: requestBody}
})
