import {CerberusConnection} from "./connection"
import {RequestID} from "./request"

/**
 * Response is a standardized representation of a response in Cerberus
 * @showindocs
 */
export class CerberusResponse {
    public connection: CerberusConnection
    public data: any
    public requestID: RequestID

    /**
     * @param connection The connection that this response should be sent on
     * @param data Data for this response. Should be able to stringify using JSON.stringify
     * @param requestID The RequestID for the request corresponding to this response
     * @showindocs
     */
    constructor(connection: CerberusConnection, data: object, requestID: RequestID) {
        this.connection = connection
        this.data = data
        this.requestID = requestID
    }
}
