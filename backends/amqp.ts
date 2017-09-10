import amqp = require("amqplib/callback_api")
import uuid = require("node-uuid")

import {SendResponse} from "../cerberus"
import {CerberusConnection} from "../routing/connection"
import {CerberusRequest} from "../routing/request"
import {CerberusResponse} from "../routing/response"
import {IBackend} from "./backend-interface"

/**
 * The AMQP Backend is used to communicate with your other backend services
 * using RPC over a message queue
 */
export class AMQPBackend implements IBackend {
    private amqpURI: string
    private replyExchange: string
    private rpcQueue: string
    private instanceUUID: string
    private pushChannel: any
    private clients: { [key: string]: CerberusConnection; } = {}
    private users: { [key: string]: CerberusConnection[]; }  = {}

    /**
     * @showindocs
     * @param amqpURI URI used to connect to the message queue
     * @param replyExchange Name of the exchange to listen for replies on
     * @param rpcQueue Queue to send requests on
     * @example
     *
     * var b = new AMQPBackend("amqp://SOME_IP:2345", "cerberusResponse", "rpcQueue")
     */
    constructor(amqpURI: string, replyExchange: string, rpcQueue: string) {
        this.amqpURI = amqpURI
        this.instanceUUID = uuid.v4()
        this.replyExchange = replyExchange
        this.rpcQueue = rpcQueue
    }

    public enable(sendResponse: SendResponse) {
        const self = this

        amqp.connect(this.amqpURI, function(connErr, conn) {
            if (connErr) {
                console.error("Error connecting to amqp", connErr)
            }

            conn.createChannel(function(createChannelErr, ch) {
                if (createChannelErr) {
                    console.error("Error creating amqp channel", createChannelErr)
                }

                ch.assertExchange(self.replyExchange, "direct", {durable: false})
                ch.assertQueue("", {exclusive: true}, function(err, q) {
                    self.pushChannel = ch

                    // Receive messages meant for all cerberus instances
                    ch.bindQueue(q.queue, self.replyExchange, "all")

                    // Receive responses for this one
                    ch.bindQueue(q.queue, self.replyExchange, self.instanceUUID)

                    ch.consume(q.queue, function(msg) {
                        const message = JSON.parse(msg.content.toString())
                        console.log("Got Message: ", message)

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
                                    // Not a response to a specific request
                                    sendResponse(new CerberusResponse(client, message, null))
                                }
                            }
                        }
                    }, {noAck: true})
                })
            })
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
            _cerberusInstance: this.instanceUUID,
            _cerberusRequestID: req.requestID,
        }}

        if (this.pushChannel != null) {
            this.pushChannel.sendToQueue(this.rpcQueue, new Buffer(JSON.stringify(data)))
        } else {
            console.log("Error sending message. Channel not open")
        }
    }
}
