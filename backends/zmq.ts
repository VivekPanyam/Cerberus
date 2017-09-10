import zmq = require("zmq")

import {SendResponse} from "../cerberus"
import {CerberusConnection} from "../routing/connection"
import {CerberusRequest} from "../routing/request"
import {CerberusResponse} from "../routing/response"
import {IBackend} from "./backend-interface"

/**
 * The ZMQ Backend is used to communicate with your other backend services
 * using ZeroMQ
 * @showindocs
 */
export class ZMQBackend implements IBackend {
    private zmqPushURI: string
    private zmqSubURI: string
    private clients: { [key: string]: CerberusConnection; } = {}
    private users: { [key: string]: CerberusConnection[]; }  = {}
    private sub: any // Sub socket
    private push: any // Push Socket

    /**
     * @showindocs
     * @param zmqPushURI URI to connect to a ZMQ push socket
     * @param zmqSubURI URI to connect to a ZMQ sub socket
     * @example
     *
     * new ZMQBackend("tcp://SOME_IP:2345", "tcp://SOME_IP:2346")
     */
    constructor(zmqPushURI: string, zmqSubURI: string) {
        this.zmqPushURI = zmqPushURI
        this.zmqSubURI = zmqSubURI
    }

    public enable(sendResponse: SendResponse) {
        this.sub = zmq.socket("sub")
        this.push = zmq.socket("push")
        this.push.connect(this.zmqPushURI)
        this.sub.connect(this.zmqSubURI)
        this.sub.subscribe("")
        const self = this
        this.sub.on("message", function(message) {
            message = message.toString()
            console.log("Got Message: ", message)
            message = JSON.parse(message)
            const clientID = message._cerberusConnectionID
            const requestID = message._cerberusRequestID
            if (clientID != null) {
                sendResponse(new CerberusResponse(self.clients[clientID], message, requestID))
            } else {
                // TODO: do this better
                const userID = message._cerberusUserID
                const userClients = self.users[userID]
                if (userClients != null) {
                    for (const client of userClients) {
                        sendResponse(new CerberusResponse(client, message, null))
                    }
                }
            }

        })
    }

    public handleConnection(connection: CerberusConnection) {
        this.clients[connection.id] = connection
        if (this.users[connection.userID] == null) {
            this.users[connection.userID] = []
        }

        this.users[connection.userID].push(connection)
        return connection
    }

    public handleRequest(req: CerberusRequest) {
        const data = {...req.data, ...{
            _cerberusConnectionID: req.connection.id,
            _cerberusRequestID: req.requestID,
        }}

        this.push.send(JSON.stringify(data))
    }
}
