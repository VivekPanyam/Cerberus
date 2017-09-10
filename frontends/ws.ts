import url = require("url")
import nodews = require("ws")

const WebSocketServer = nodews.Server

import {CreateConnection, SendRequest} from "../cerberus"
import {CerberusConnection} from "../routing/connection"
import {CerberusRequest} from "../routing/request"
import {IFrontend} from "./frontend-interface"

/**
 * WSFrontend starts a Websocket server on a specified port
 * @showindocs
 */
export class WSFrontend implements IFrontend {
    private port: number
    private allowForwadedFor: boolean

    /**
     * @showindocs
     * @param port The port to run the server on
     * @param allowForwadedFor Whether or not to look at IP addresses in the x-forwarded-for header
     * @example
     *
     * var c = new Cerberus()
     *
     * // Add a Websocket frontend
     * c.addFrontend(new WSFrontend(8080, false))
     */
    constructor(port: number, allowForwadedFor?: boolean) {
        this.port = port
        this.allowForwadedFor = allowForwadedFor || false
    }

    /**
     * Called by `Cerberus.addFrontend` when this frontend is enabled
     * @param createConnection A function that should be called  when the frontend receives a connection
     * @param sendRequest A function that should be called when the frontend receives a request
     */
     public enable(createConnection: CreateConnection, sendRequest: SendRequest) {
         const self = this
         const wss = new WebSocketServer({ port: this.port })
         wss.on("connection", function(ws) {
             const location = url.parse(ws.upgradeReq.url, true)
             let closed = false

             const send = function(data) {
                 if (!closed) {
                     ws.send(JSON.stringify(data))
                 }
             }

             const close = function() {
                 closed = true
                 ws.close()
             }

             const handleError = function(error) {
                if (error) {
                    send(error)
                    close()
                    return true
                }
                return false
            }

             const ipAddr = ((self.allowForwadedFor && ws.upgradeReq.headers["x-forwarded-for"])
                 || ws.upgradeReq.connection.remoteAddress)
             const connection = new CerberusConnection(send, close, ws.upgradeReq.headers, location, ipAddr)

             createConnection(connection, function(error) {
                 if (handleError(error)) {
                    return
                 }

                 ws.on("message", function incoming(message) {
                     try {
                         message = JSON.parse(message)
                         const request = new CerberusRequest(connection, message)
                         sendRequest(request, function(err) {
                            if (err) {
                                send(err)
                            }
                        })
                     } catch (e) {
                         send("Message Not JSON")
                     }
                 })
             })

             ws.on("close", function() {
                 closed = true
             })
         })
     }
}
