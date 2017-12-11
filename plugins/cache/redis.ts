import redis = require("redis")

import {SendResponse} from "../../cerberus"
import {CerberusRequest, RequestID} from "../../routing/request"
import {CerberusResponse} from "../../routing/response"
import {IPlugin} from "../plugin-interface"

/**
 * A plugin to cache specific requests and responses in Redis.
 * This is useful for sharing a cache between multiple Cerberus instances.
 * @showindocs
 */
export class RedisCache implements IPlugin {
    private client: any
    private redisCachePrefix: string
    private getCacheKey: (request: CerberusRequest) => (string|null)
    private sendResponse: SendResponse

    // The key is of type RequestID and the value is the cacheKey
    private responsesToCache: {[key: string]: string} = {}

    /**
     * @showindocs
     * @param hostname Redis hostname or IP address
     * @param port Redis port
     * @param redisCachePrefix Prefix to add to cache keys returned by `getCacheKey`
     * @param getCacheKey A function to get cache keys given a request. Can return null if you do
     * not want to cache the response to a given request
     * @example
     *
     * // Use the location as the cache key
     * var cachePlugin = new RedisCache("127.0.0.1", 6379, "", (request) => request.data.location)
     *
     * // Build request pipeline
     * c.addPlugin(cachePlugin, "request")
     *
     * // Add other stuff
     *
     * // Build response pipeline
     * c.addPlugin(cachePlugin, "response")
     */
    constructor(hostname: string,
                port: number,
                redisCachePrefix: string,
                getCacheKey: (request: CerberusRequest) => (string|null)) {
        this.getCacheKey = getCacheKey
        this.redisCachePrefix = redisCachePrefix
        this.client = redis.createClient(port, hostname)
        this.client.on("error", function(err) {
            console.log("Redis Error ", err)
        })
    }

    public setResponseSender(sendResponse: SendResponse) {
        this.sendResponse = sendResponse
    }

    public handleRequest(request: CerberusRequest) {
        const self = this
        let cacheKey = this.getCacheKey(request)

        if (cacheKey != null) {
            cacheKey = this.redisCachePrefix + cacheKey

            return new Promise<boolean|null>(function(resolve, reject) {
                self.client.get(cacheKey, function(err, reply) {
                    if (reply != null) {
                        // Get our cached response
                        const responseData = JSON.parse(reply)

                        // Send it as a response to our current request
                        self.sendResponse(new CerberusResponse(request.connection, responseData, request.requestID))

                        // Stop processing this request
                        return resolve(false)
                    }

                    // We didn't have a response cached.
                    // Cache the response when we get it.
                    self.responsesToCache[request.requestID] = cacheKey

                    return resolve()
                })
            })
        }
    }

    public handleResponse(response: CerberusResponse) {
        const cacheKey = this.responsesToCache[response.requestID]
        if (cacheKey) {
            // Add to cache
            this.client.set(cacheKey, JSON.stringify(response.data))

            // Remove from responsesToCache
            delete this.responsesToCache[response.requestID]
        }
    }

}
