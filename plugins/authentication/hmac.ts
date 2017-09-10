import crypto = require("crypto")
const createHmac = crypto.createHmac

import {CerberusConnection} from "../../routing/connection"
import {IPlugin} from "../plugin-interface"

/**
 * A plugin that validates a HMAC signed token when a new connection is established.
 * This is compatible with signed cookies from Express (https://github.com/expressjs/cookie-parser)
 * When the authenticator receives a `CerberusRequest` object, it sets the `userID`
 * field in the request if the token is valid
 * @showindocs
 */
export class HMACAuthenticator implements IPlugin {
    private shouldErrorOnInvalidToken: boolean
    private key: string
    private queryParamName: string

    /**
     * @showindocs
     * @param key The key that the token should be signed with
     * @param queryParamName The name of the query parameter where the token is stored
     * @param shouldErrorOnInvalidToken Whether or not connections with invalid tokens should
     * throw an error be closed. If this is false, unsigned requests won't have a valid `userID`
     * @example
     *
     * var c = new Cerberus()
     *
     * c.addPlugin(new HMACAuthenticator("SUPER_SECRET_HMAC_KEY", "token", false))
     */
    constructor(key: string, queryParamName: string, shouldErrorOnInvalidToken?: boolean) {
        this.shouldErrorOnInvalidToken = shouldErrorOnInvalidToken || false
        this.key = key
        this.queryParamName = queryParamName
    }

    public handleConnection(connection: CerberusConnection) {
        const userID = isValid(connection.location.query[this.queryParamName], this.key)
        if (userID == null && this.shouldErrorOnInvalidToken) {
            return "Invalid Authentication Token"
        }

        connection.userID = userID

        return connection
    }
}

function sign(text: string, key: string) {
    return createHmac("sha256", key).update(text).digest("base64").replace(/\+/g, "").replace(/=/g, "")
}

function isValid(signature: string, key: string) {
    if (signature == null) {
        return null
    }

    const val = decodeURIComponent(signature).replace(/\+/g, "").replace(/=/g, "")
    if (val.indexOf(":") < 0) {
        return null
    }

    let userID = val.split(":")[1]
    if (userID.indexOf(".") < 0) {
        return null
    }

    userID = userID.split(".")[0]
    const valid =  (("s:" + userID + "." + sign(userID, key)) === val)
    if (valid) {
        return userID
    } else {
        return null
    }
}
