import uuid = require("node-uuid")

import {Url} from "url"

/**
 * The interface of a function that can send data on a connection
 * @param data An object that can be stringified by JSON.stringify
 */
export type ConnectionSendFunction = (data: object) => void

/**
 * The interface of a function that closes a connection
 */
export type ConnectionCloseFunction = () => void

/**
 * CerberusConnection is a standardized representation of a connection to Cerberus
 * @showindocs
 */
export class CerberusConnection {
  public sendResponse: ConnectionSendFunction
  public close: ConnectionCloseFunction
  public headers: object
  public location: Url
  public ipAddr: string
  public id: string
  public pluginData: object

  // ID of the user associated with this connection (if any)
  public userID: string

  /**
   * @param sendFn A function that sends data on the connection
   * @param closeFn A function that closes the connection
   * @param headers Headers
   * @param location Output of uri.parse
   * @param ipAddr Remote IP address
   * @showindocs
   */
  constructor(sendFn: ConnectionSendFunction,
              closeFn: ConnectionCloseFunction,
              headers: object,
              location: Url,
              ipAddr: string) {
      this.sendResponse = sendFn
      this.close = closeFn
      this.headers = headers
      this.location = location
      this.ipAddr = ipAddr
      this.id = uuid.v4()
      this.pluginData = {}
  }
}
