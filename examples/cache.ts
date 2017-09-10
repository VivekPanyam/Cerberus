import {Cerberus, EventType} from "../cerberus"
const HTTPFrontend = Cerberus.Frontends.HTTPFrontend
const LRUCache = Cerberus.Plugins.LRUCache
const HTTPBackend = Cerberus.Backends.HTTPBackend

// This means that `httpReq.url` will be stored in the `data` attribute of the `CerberusRequest`
const httpFrontend = new HTTPFrontend(3000, false, (httpReq) => ({ location: httpReq.url }))

// Use the location as the cache key
const cachePlugin = new LRUCache({max: 5000, maxAge: 60 * 60 * 1000}, (request) => request.data.location)

// Forward requests to our backend
const httpBackend = new HTTPBackend((req) => ({url: "http://example.com"}))

const c = new Cerberus()

c.addFrontend(httpFrontend)

// Build request pipeline
c.addPlugin(cachePlugin, EventType.REQUEST)

// Build response pipeline
c.addPlugin(cachePlugin, EventType.RESPONSE)

c.setBackend(httpBackend)
