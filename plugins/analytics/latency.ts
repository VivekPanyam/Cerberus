import LRU = require("lru-cache")

import {CerberusRequest} from "../../routing/request"
import {CerberusResponse} from "../../routing/response"
import {IPlugin} from "../plugin-interface"

/**
 * A plugin that logs the time between a request and the corresponding response.
 * @showindocs
 */
export class LatencyLogger implements IPlugin {
    private cache: any
    private getRequestMethodName: (request: CerberusRequest) => string

    /**
     * @showindocs
     * @param maxNumConcurrentRequestsToTrack The max number of requests that can be tracked at a time
     * @param maxRequestAge The longest request that can be tracked (in ms)
     * @param getRequestMethodName Function to get the name to be logged given a `CerberusRequest`
     * @example
     *
     * new LatencyLogger(500, 1000, (req) => req.data.method)
     */
    constructor(maxNumConcurrentRequestsToTrack: number,
                maxRequestAge: number,
                getRequestMethodName: (request: CerberusRequest) => string) {
        this.cache = LRU({ max: maxNumConcurrentRequestsToTrack, maxAge: maxRequestAge})
        this.getRequestMethodName = getRequestMethodName
    }

    public handleRequest(request: CerberusRequest) {
        const key = request.requestID
        this.cache.set(key, {
            time: Date.now(),
            method: this.getRequestMethodName(request),
        })
    }

    public handleResponse(response: CerberusResponse) {
        const key = response.requestID
        if (this.cache.has(key)) {
            const reqdata = this.cache.get(key)
            console.log("Request took (ms)", reqdata.method, Date.now() - reqdata.time)
        } else {
            console.log("Request key expired")
        }
    }
}
