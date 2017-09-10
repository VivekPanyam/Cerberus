# Cerberus

Cerberus is a library for easily creating a gateway or access point to your backend. It can handle authentication, access control logic, rate limiting, analytics, logging, caching, and performance monitoring among other things.

Once Cerberus validates a user's request or connection, it can pass the request or connection on to the rest of your backend.

Cerberus is build around frontends, plugins, transformers, and backends:

* **Frontends** are responsible for handling connections from clients (see  `CerberusConnection`), receiving requests from clients (see `CerberusRequest`), and sending responses to clients (see `CerberusResponse`).
* **Plugins** can run arbitrary code in response to a `CerberusRequest`, a `CerberusConnection`, or a `CerberusResponse`. This can even include things like cancelling or transforming a request or response.
* **Transformers** are lightweight versions of plugins. They can be used in cases where building a generalized plugin doesn't make sense.
* **Backends** are responsible for passing a `CerberusRequest` to another system and getting a `CerberusResponse`.


For example, if you wanted to accept HTTP and Websocket connections, validate an HMAC signed token, rate limit requests by IP address, limit access for users who are not logged in, and finally pass on requests to another backend system, you could do this:

```javascript
var c = new Cerberus();

// Add a Websocket frontend
c.addFrontend(new WSFrontend(8080));

// Add a HTTP frontend
// `location.query` is what we want to store
c.addFrontend(new HTTPFrontend(8081, false, (httpReq, location) => location.query));

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
c.addPlugin(new HMACAuthenticator("SUPER_SECRET_HMAC_KEY", "token", false));

// Limit all calls to 10 requests per second per IP address
c.addPlugin(new RateLimit(10, 1000, () => true));

// Don't allow unauthenticated requests where "color" is set to "green"
c.on("request", function(request) {
  // userID is not set unless the connection has a signed token
  if (!request.connection.userID) {
    if (request.data["color"] == "green") {
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
        data: req.data["color"]
    }
})));
```

This means that a client can make any of the following requests successfully:

* HTTP request to http://localhost:8081/?token=VALID_SIGNED_TOKEN&color=green
* HTTP request to http://localhost:8081/?color=blue
* Websocket connection to http://localhost:8080/?token=invalid
	* Message: `{"color": "blue"}`
	* Message: `{"color": "red"}`
* Websocket connection to http://localhost:8080/?token=VALID_SIGNED_TOKEN
	* Message: `{"color": "blue"}`
	* Message: `{"color": "green"}`

But the following requests will fail:

* HTTP request to http://localhost:8081/?token=invalid&color=green
* Websocket connection to http://localhost:8080/?token=invalid
	* Message: `{"color": "red"}`
	* Message: `{"color": "yellow"}`
	* Message: `{"color": "green"}` - This request will fail
	* Message: `{"color": "blue"}`

See `examples/acl.ts` for the complete code and `tests/acl.test.ts` for a test that tests all the above cases.

## Getting Cerberus

```
npm install cerberus-gateway
```

## Using Cerberus
### Frontends

Frontends can be added with `Cerberus.addFrontend(frontend)`.

The built in frontends are

* [HTTPFrontend](https://vivekpanyam.github.io/Cerberus/#frontends/http.HTTPFrontend)
* [WSFrontend](https://vivekpanyam.github.io/Cerberus/#frontends/ws.WSFrontend)


See the links above or `frontends/http.ts` and `frontends/ws.ts` for more details and usage information.

If you want to create a new frontend, implement the interface defined in `frontends/frontend-interface.ts`.

### Plugins

Plugins can be added with `Cerberus.addPlugin(plugin, eventType)` where `eventType` is one of ``"connection"``, ``"request"``, or ``"response"``. If a plugin only handles one of these, the `eventType` parameter is ignored.

If a plugin contains multiple handlers, you will need to add the plugin once for every handler. For example, if a plugin needs to run during both requests and responses, you will need to add it once to the request chain and once to the response chain.

**Note:** The order in which plugins are added is the order in which they are executed.

```javascript
var latencyMeasurement = ... // Some plugin
c.addPlugin(latencyMeasurement, "request")

// Add other plugins

c.addPlugin(latencyMeasurement, "response")
```

The built in plugins are

* [LatencyLogger](https://vivekpanyam.github.io/Cerberus/#plugins/analytics/latency.LatencyLogger)
	* A plugin that logs the time between a request and the corresponding response.
* [HMACAuthenticator](https://vivekpanyam.github.io/Cerberus/#plugins/authentication/hmac.HMACAuthenticator)
	* A plugin that validates a HMAC signed token when a new connection is established.
* [LRUCache](https://vivekpanyam.github.io/Cerberus/#plugins/cache/lru.LRUCache)
	* A plugin to cache specific requests and responses in an in-memory LRU cache.
* [RedisCache](https://vivekpanyam.github.io/Cerberus/#plugins/cache/redis.RedisCache)
	* A plugin to cache specific requests and responses in Redis. This is useful for sharing a cache between multiple Cerberus instances.
* [RateLimit](https://vivekpanyam.github.io/Cerberus/#plugins/traffic/rate-limit.RateLimit)
	* A configurable rate limiter for requests based on IP address.

See the links above or the files in the `plugins` directory for more details and usage information.

If you want to create a new plugin, implement the interface defined in `plugins/plugin-interface.ts`.


### Backend:

A backend can be added with `Cerberus.setBackend(backend)`.

The built in backends are

* [HTTPBackend](https://vivekpanyam.github.io/Cerberus/#backends/http.HTTPBackend)
* [AMQPBackend](https://vivekpanyam.github.io/Cerberus/#backends/amqp.AMQPBackend)
* [ZMQBackend](https://vivekpanyam.github.io/Cerberus/#backends/zmq.ZMQBackend)

See the links above or `backends/http.ts`, `backends/amqp.ts`, and `backends/zmq.ts` for more details and usage information.

If you want to create a new backend, implement the interface defined in `backends/backend-interface.ts`.

### Transformers:

Transformers can do everything that a handler in a plugin can do. See the plugin interface definition (`plugins/plugin-interface.ts`) for more details and `examples/acl.ts` for an example.

```javascript
var c = new Cerberus();
c.on('request', function(request) {
	// Do something
})

c.on('response', function(response) {
	// Do something
})

c.on('connection', function(connection) {
	// Do something
})
```

## Examples

See the files in the `examples` directory. Many of these have corresponding tests in the `tests` directory

## Tests

Run `npm test`

Many of the tests work by overriding the `http` or `ws` node modules with mock versions (see `tests/test-utils.ts`). After this, they generally import an example from the `examples` folder and validate that things behave like they should. See `tests/acl.test.ts` for a comprehensive example.

## Contributing

 1. Clone this repo
 1. Make some changes
 1. Add or modify an example in the `examples` folder (if applicable)
 1. Write a test in the `tests` folder (if applicable)
 1. Run `npm run prepublish` to make sure everything builds, tests pass, and there are no lint errors
 1. Send a pull request!

## License

Apache 2.0