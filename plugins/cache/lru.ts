import LRU = require("lru-cache")

import {SendResponse} from "../../cerberus"
import {CerberusRequest, RequestID} from "../../routing/request"
import {CerberusResponse} from "../../routing/response"
import {IPlugin} from "../plugin-interface"

/**
 * A plugin to cache specific requests and responses in an in-memory LRU cache.
 * @showindocs
 */
export class LRUCache implements IPlugin {
    private cache: any
    private getCacheKey: (request: CerberusRequest) => (string|null)
    private sendResponse: SendResponse

    // The key is of type RequestID and the value is the cacheKey
    private responsesToCache: {[key: string]: string} = {}

    /**
     * @showindocs
     * @param cacheParams Params to pass into `lru-cache`
     * @param getCacheKey A function to get cache keys given a request. Can return null if you do
     * not want to cache the response to a given request
     * @example
     *
     * // Use the location as the cache key
     * var cachePlugin = new LRUCache({max: 5000, maxAge: 60 * 60 * 1000}, (request) => request.data.location)
     *
     * // Build request pipeline
     * c.addPlugin(cachePlugin, "request")
     *
     * // Add other stuff
     *
     * // Build response pipeline
     * c.addPlugin(cachePlugin, "response")
     */
    constructor(cacheParams: object, getCacheKey: (request: CerberusRequest) => (string|null)) {
        this.cache = LRU(cacheParams)
        this.getCacheKey = getCacheKey
    }

    public setResponseSender(sendResponse: SendResponse) {
        this.sendResponse = sendResponse
    }

    public handleRequest(request: CerberusRequest) {
        const self = this
        const cacheKey = this.getCacheKey(request)

        if (cacheKey != null) {
            if (this.cache.has(cacheKey)) {
                let responseData = this.cache.get(cacheKey)

                // Clone our cached response
                responseData = JSON.parse(responseData)

                // Send it as a response to our current request
                self.sendResponse(new CerberusResponse(request.connection, responseData, request.requestID))

                // Stop processing this request
                return false
            }

            // We didn't have a response cached.
            // Cache the response when we get it.
            this.responsesToCache[request.requestID] = cacheKey
        }
    }

    public handleResponse(response: CerberusResponse) {
        const cacheKey = this.responsesToCache[response.requestID]
        if (cacheKey) {
            // Add to cache
            this.cache.set(cacheKey, JSON.stringify(response.data))

            // Remove from responsesToCache
            delete this.responsesToCache[response.requestID]
        }
    }
}
