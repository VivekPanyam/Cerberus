import events = require("events")

import {Backends} from "./backends"
import {IBackend} from "./backends/backend-interface"
import {Frontends} from "./frontends"
import {IFrontend} from "./frontends/frontend-interface"
import {Plugins} from "./plugins"
import {IPlugin} from "./plugins/plugin-interface"
import {CerberusConnection} from "./routing/connection"
import {CerberusRequest} from "./routing/request"
import {CerberusResponse} from "./routing/response"

/**
 * Error callback
 */
export type ErrorCallback = (error: any) => void

/**
 * Notify Cerberus of a new connection
 */
export type CreateConnection = (connection: CerberusConnection, errorCallback?: ErrorCallback) => void

/**
 * Notify Cerberus of a new request
 */
export type SendRequest = (request: CerberusRequest, errorCallback?: ErrorCallback) => void

/**
 * The interface of a function that can send response
 */
export type SendResponse = (request: CerberusResponse) => void

type AnyCerberusType = (CerberusConnection|CerberusRequest|CerberusResponse)
type EventHandlerReturnTypes = (AnyCerberusType|boolean|string|void)

/**
 * Any function that can handle a Cerberus event.
 * See `plugins/plugin-interface.ts` for more detail
 */
type EventHandler = (data: AnyCerberusType) => EventHandlerReturnTypes

// Export types
export type CerberusConnection = CerberusConnection
export type CerberusRequest = CerberusRequest
export type CerberusResponse = CerberusResponse

/**
 * Different event types that cerberus can handle
 */
export enum EventType {
    CONNECTION = "connection",
    REQUEST = "request",
    RESPONSE = "response",
}

function chain(item: AnyCerberusType, middlewares: EventHandler[]) {
    function handlePromiseReturnValues(retval) {
        // If we didn't return anything, pass the original item to the next handler
        if (retval == null) {
            return item
        }

        // This is a user visible error
        // Don't call the rest of the middlewares
        if (typeof retval === "string") {
            return Promise.reject({_userVisibleError: retval})
        }

        // Short circuit the rest of the chain.
        // Don't call the rest of the middlewares
        if (retval === false) {
            return Promise.reject({_shortCircuit: true})
        }

        return retval
    }

    let previous: Promise<EventHandlerReturnTypes> = Promise.resolve(item)
    for (const middleware of middlewares) {
        previous = previous.then(handlePromiseReturnValues).then(middleware)
    }

    return previous.then(handlePromiseReturnValues)
}

function setup(cerberusInstance: Cerberus, eventType: EventType, middlewares: EventHandler[], onError, onSuccess) {
    cerberusInstance.ee.on(eventType, function(data, errorCallback) {
            chain(data, middlewares).then(function(a) {
                onSuccess(a)
                if (errorCallback) {
                    errorCallback(null)
                }
            }, function(a) {
                if (a._shortCircuit) {
                    // We didn't fail, we were told to not run the rest of the handlers (including onSuccess)
                    if (errorCallback) {
                        errorCallback(null)
                    }
                    return
                }


                if (errorCallback) {
                    // This must be a CerberusRequest or CerberusConnection event
                    // (because SendResponse does not have an error callback)
                    if (a._userVisibleError) {
                        // If this is a user visible error, send it back
                        errorCallback({error: a._userVisibleError})
                    } else {
                        // Don't send the specific error back to the frontend
                        onError(a)
                        errorCallback({error: "Unfortunately, an error occurred. Please try again later"})
                    }
                } else {
                    onError(a)
                }
            }).catch(function(err) {
                console.error("Error in handlers", err, err.stack)
            })
    })
}

function getSupportedEventsForPlugin(plugin: IPlugin): EventType[] {
    const supported: EventType[] = []
    if (plugin.handleConnection) {
        supported.push(EventType.CONNECTION)
    }

    if (plugin.handleRequest) {
        supported.push(EventType.REQUEST)
    }

    if (plugin.handleResponse) {
        supported.push(EventType.RESPONSE)
    }

    return supported
}

function setupPlugin(cerberusInstance: Cerberus, plugin: IPlugin, eventType: EventType) {
    let handler = null
    switch (eventType) {
        case EventType.REQUEST:
            handler = plugin.handleRequest
            break
        case EventType.RESPONSE:
            handler = plugin.handleResponse
            break
        case EventType.CONNECTION:
            handler = plugin.handleConnection
            break
    }

    cerberusInstance.on(eventType, handler.bind(plugin))
}

/**
 * The main Cerberus class
 * @showindocs
 */
export class Cerberus {
    public static Plugins   = Plugins
    public static Frontends = Frontends
    public static Backends  = Backends

    public ee: events.EventEmitter = new events.EventEmitter()
    private backend: IBackend       = null

    private newConnectionHandlers: EventHandler[] = []
    private newRequestHandlers: EventHandler[]    = []
    private newResponseHandlers: EventHandler[]   = []

    /**
     * @showindocs
     * @example
     * var c = new Cerberus()
     */
    constructor() {
        const self = this
        setup(this, EventType.CONNECTION, this.newConnectionHandlers,
            function(err) {
                console.error("Promise Rejected", err, err.stack)
            },
            function(connection) {
                // Do nothing
            },
        )

        setup(this, EventType.REQUEST, this.newRequestHandlers,
            function(err) {
                console.error("Promise Rejected", err, err.stack)
            },
            function(request) {
                if (self.backend != null) {
                self.backend.handleRequest(request)
            } else {
                console.error("Request failed; no backend configured.")
            }
            },
        )

        setup(this, EventType.RESPONSE, this.newResponseHandlers,
            function(err) {
                console.error("Promise Rejected", err, err.stack)
            },
            function(response) {
                // Send to frontend
            response.connection.sendResponse(response.data)
            },
        )
    }

    /**
     * Adds a frontend
     *
     * @showindocs
     * @param frontend The frontend to add
     * @example
     *
     * var c = new Cerberus()
     *
     * // Add a Websocket frontend
     * c.addFrontend(new WSFrontend(8080))
     *
     * // Add a HTTP frontend
     * // `location.query` is what we want to store
     * c.addFrontend(new HTTPFrontend(8081, false, (httpReq, location) => location.query))
     */
    public addFrontend(frontend: IFrontend) {
        const self = this
        frontend.enable(
            function(connection: CerberusConnection, errorCallback?: ErrorCallback) {
                self.ee.emit(EventType.CONNECTION, connection, errorCallback)
            },
            function(request: CerberusRequest, errorCallback?: ErrorCallback) {
                self.ee.emit(EventType.REQUEST, request, errorCallback)
            },
        )
    }

    /**
     * Adds a plugin.
     * If a plugin contains multiple handlers, you will need to add the plugin once for every handler.
     * For example, if a plugin needs to run during both requests and responses, you will need to add
     * it once to the request chain and once to the response chain.
     *
     * **Note:** The order in which plugins are added is the order in which they are executed.
     *
     * @showindocs
     * @param plugin The plugin to add
     * @param eventType one of `"connection"`, ``"request"``, or ``"response"``.
     * If a plugin only handles one of these, the `eventType` parameter is ignored.
     * @example
     *
     * var latencyMeasurement = ... // Some plugin
     * c.addPlugin(latencyMeasurement, "request")
     *
     * // Add other plugins
     *
     * c.addPlugin(latencyMeasurement, "response")
     */
    public addPlugin(plugin: IPlugin, eventType?: EventType) {
        const supportedEvents = getSupportedEventsForPlugin(plugin)
        const self = this

        if (plugin.setResponseSender) {
            plugin.setResponseSender(function(response: CerberusResponse) {
                self.ee.emit(EventType.RESPONSE, response)
            })
        }

        if (supportedEvents.length > 1) {
            if (eventType == null) {
                throw new Error(`This plugin listens to multiple events.
                    Please setup the parts individually (specify eventType)`)
            } else {
                setupPlugin(this, plugin, eventType)
            }
        } else if (supportedEvents.length > 0) {
            setupPlugin(this, plugin, supportedEvents[0])
        } else {
            console.log("This plugin does not listen to any events")
        }
    }

    /**
     * Sets the backend
     * @showindocs
     * @param backend The backend to use
     */
    public setBackend(backend: IBackend) {
        const self = this
        backend.enable(function(response: CerberusResponse) {
            self.ee.emit(EventType.RESPONSE, response)
        })

        if (backend.handleConnection) {
            this.on(EventType.CONNECTION, backend.handleConnection.bind(backend))
        }

        this.backend = backend
    }

    /**
     * Run an `EventHandler` when an event fires
     * @showindocs
     * @param type The event type
     * @param middleware The event handler
     * @example
     *
     * var c = new Cerberus();
     * c.on('request', function(request) {
     *     // Do something
     * })
     *
     * c.on('response', function(response) {
     *     // Do something
     * })
     *
     * c.on('connection', function(connection) {
     *     // Do something
     * })
     */
    public on(type: EventType, middleware: EventHandler) {
        if (type === EventType.CONNECTION) {
            this.newConnectionHandlers.push(middleware)
        } else if (type === EventType.REQUEST) {
            this.newRequestHandlers.push(middleware)
        } else if (type === EventType.RESPONSE) {
            this.newResponseHandlers.push(middleware)
        } else {
            throw new Error("Invalid event type")
        }
    }
}
