import uuid = require("node-uuid")

import {CerberusConnection} from "./connection"

// UUID v4
export type RequestID = string

/**
 * Request is a standardized representation of a request to Cerberus
 * @showindocs
 */
export class CerberusRequest {
    public connection: CerberusConnection
    public data: any
    public requestID: RequestID

    /**
     * @param connection The connection that this request originated from
     * @param data Data for this request
     * @showindocs
     */
    constructor(connection: CerberusConnection, data: object) {
        this.connection = connection
        this.data = data
        this.requestID = uuid.v4()
    }
}
