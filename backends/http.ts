import request = require("request")

import {SendResponse} from "../cerberus"
import {CerberusRequest} from "../routing/request"
import {CerberusResponse} from "../routing/response"
import {IBackend} from "./backend-interface"

/**
 * The HTTP Backend is used to communicate with your other backend services
 * via HTTP requests
 * @showindocs
 */
export class HTTPBackend implements IBackend {
    private generateRequestOptions: (req: CerberusRequest) => object
    private sendResponse: SendResponse

    /**
     * @showindocs
     * @param generateRequestOptions generate options for the `request` node library given a `CerberusRequest`
     * @example
     *
     * new HTTPBackend((req) => ({
     *   url: "https://some-internal-host:4032",
     *   method: "POST",
     *   json: {
     *       user: req.connection.userID,
     *       data: req.data.color,
     *   },
     * }))
     */
    constructor(generateRequestOptions: (req: CerberusRequest) => object) {
        this.generateRequestOptions = generateRequestOptions
    }

    public enable(sendResponse: SendResponse) {
        this.sendResponse = sendResponse
    }

    public handleRequest(req: CerberusRequest) {
        const self = this
        const options = this.generateRequestOptions(req)

        request(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                self.sendResponse(new CerberusResponse(req.connection, body, req.requestID))
            }
        })
    }
}
