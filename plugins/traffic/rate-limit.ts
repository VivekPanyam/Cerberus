import nodelimiter = require("limiter")
const RateLimiter = nodelimiter.RateLimiter

import {CerberusRequest} from "../../routing/request"
import {IPlugin} from "../plugin-interface"

/**
 * A configurable rate limiter for requests based on IP address.
 * @showindocs
 */
export class RateLimit implements IPlugin {
    private numRequests: number
    private timeframe: number
    private limiters: object
    private shouldRateLimit: (request: CerberusRequest) => boolean

    /**
     * @showindocs
     * @param numRequests The number of requests allowed in `timeframe`
     * @param timeframe The timeframe in ms for the rate limit
     * @param shouldRateLimit A function that takes a `CerberusRequest` and returns whether or
     * not to count the request against the rate limit.
     * @example
     *
     * var c = new Cerberus()
     *
     * // Limit all calls to 10 requests per second per IP address
     * c.addPlugin(new RateLimit(10, 1000, () => true))
     */
    constructor(numRequests, timeframe, shouldRateLimit: (request: CerberusRequest) => boolean) {
        this.numRequests = numRequests + 1
        this.timeframe = timeframe
        this.limiters = {}
        this.shouldRateLimit = shouldRateLimit
    }

    public handleRequest(request: CerberusRequest) {
        const ipaddr = request.connection.ipAddr

        if (!this.shouldRateLimit(request)) {
            // Don't limit this request
            return request
        }

        if (this.limiters[ipaddr] == null) {
            this.limiters[ipaddr] = new RateLimiter(this.numRequests, this.timeframe, true)
        }

        const limiter = this.limiters[ipaddr]
        return new Promise<null|string>(function(resolve, reject) {
            limiter.removeTokens(1, function(err, remainingRequests) {
                if (remainingRequests < 1) {
                    resolve("Rate limit hit")
                } else {
                    resolve()
                }
            })
        })
    }
}
