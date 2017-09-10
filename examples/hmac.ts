import {Cerberus} from "../cerberus"
const HTTPFrontend = Cerberus.Frontends.HTTPFrontend
const HMACAuthenticator = Cerberus.Plugins.HMACAuthenticator
const HTTPBackend = Cerberus.Backends.HTTPBackend

const httpFrontend = new HTTPFrontend(3000, false, (httpReq) => ({}))

// Return an error on invalid token
const hmacPlugin = new HMACAuthenticator("SUPER_SECRET_HMAC_KEY", "token", true)

// Forward requests to our backend
const httpBackend = new HTTPBackend((req) => ({url: "http://example.com"}))

const c = new Cerberus()

c.addFrontend(httpFrontend)
c.addPlugin(hmacPlugin)
c.setBackend(httpBackend)
