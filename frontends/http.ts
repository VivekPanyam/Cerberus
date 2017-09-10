import http = require("http")

import {CreateConnection, SendRequest} from "../cerberus"
import {CerberusConnection} from "../routing/connection"
import {CerberusRequest} from "../routing/request"
import {IFrontend} from "./frontend-interface"

import {IncomingMessage} from "http"
import {parse as urlParse, Url} from "url"

/**
 * HTTPFrontend starts a HTTP server on a specified port
 * @showindocs
 */
export class HTTPFrontend implements IFrontend {
    private port: number
    private allowForwadedFor: boolean
    private getDataFromRequest: (req: IncomingMessage, loc: Url) => object

    /**
     * @showindocs
     * @param port The port to run the server on
     * @param allowForwadedFor Whether or not to look at IP addresses in the x-forwarded-for header
     * @param getDataFromRequest A function that returns data to store in a `CerberusRequest` given a HTTP request
     * @example
     *
     * var c = new Cerberus()
     *
     * // Add a HTTP frontend
     * // `location.query` is what we want to store
     * c.addFrontend(new HTTPFrontend(8081, false, (httpReq, location) => location.query))
     */
    constructor(port: number,
                allowForwadedFor: boolean,
                getDataFromRequest: (req: IncomingMessage, loc: Url) => object) {
        this.port = port
        this.allowForwadedFor = allowForwadedFor || false
        this.getDataFromRequest = getDataFromRequest
    }

    /**
     * Called by `Cerberus.addFrontend` when this frontend is enabled
     * @param createConnection A function that should be called  when the frontend receives a connection
     * @param sendRequest A function that should be called when the frontend receives a request
     */
    public enable(createConnection: CreateConnection, sendRequest: SendRequest) {
        const self = this
        const server = http.createServer(function(req, res) {
            const location = urlParse(req.url, true)
            let closed = false

            const send = function(data) {
                if (!closed) {
                    if (typeof data === "string") {
                        res.end(data)
                    } else {
                        res.end(JSON.stringify(data))
                    }
                    closed = true
                }
            }

            const close = function() {
                closed = true
                res.end()
            }

            const handleError = function(error) {
                if (error) {
                    send(error)
                    close()
                    return true
                }
                return false
            }

            const ipAddr = (self.allowForwadedFor && req.headers["x-forwarded-for"]) || req.connection.remoteAddress
            const connection = new CerberusConnection(send, close, req.headers, location, ipAddr.toString())
            createConnection(connection, function(error) {
                if (handleError(error)) {
                    return
                }

                const request = new CerberusRequest(connection, self.getDataFromRequest(req, location))
                sendRequest(request, handleError)
            })
        })

        server.listen(this.port, function(){
            console.log("Cerberus HTTP server listening on: http://localhost:%s", self.port)
        })
    }
}
