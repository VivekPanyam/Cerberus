import {Cerberus} from "../cerberus"
const HTTPFrontend = Cerberus.Frontends.HTTPFrontend
const RateLimit = Cerberus.Plugins.RateLimit
const HTTPBackend = Cerberus.Backends.HTTPBackend

const httpFrontend = new HTTPFrontend(3000, false, (httpReq) => ({}))

// Limit to one request per second
const hmacPlugin = new RateLimit(1, 1000, () => true)

// Forward requests to our backend
const httpBackend = new HTTPBackend((req) => ({url: "http://example.com"}))

const c = new Cerberus()

c.addFrontend(httpFrontend)
c.addPlugin(hmacPlugin)
c.setBackend(httpBackend)
