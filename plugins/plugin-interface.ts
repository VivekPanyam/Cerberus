import {SendResponse} from "../cerberus"
import {CerberusConnection} from "../routing/connection"
import {CerberusRequest} from "../routing/request"
import {CerberusResponse} from "../routing/response"

type HandleConnectionReturnType = (void|string|boolean|CerberusConnection)
type HandleRequestReturnType = (void|string|boolean|CerberusRequest)
type HandleResponseReturnType = (void|boolean|CerberusResponse)

/**
 * Note: at least one of the `handle` methods in this interface must be implemented
 *
 * Each handler can return one of the following:
 *  - null: continue processing as normal
 *  - false: stop processing this (request|response|connection) WITHOUT throwing an error
 *  - a new object of the same type it was given: continue processing with thet new object instead of the old one
 *    (e.g. handleRequest can return a new request object)
 *
 * Connection and request handlers can also return these:
 *  - a string: This is a user visible error. The connection or request will not continue to be processed.
 *    If this is returned by a connection handler, the connection should be closed
 * @showindocs
 */
export interface IPlugin {
  /**
   * If a plugin ever wants to send a response, it can get a function to do so
   * by implementing this function. This is useful in caching plugins
   *
   * @param sendResponse A function that can be called if a plugin wants to send a response
   * @showindocs
   */
  setResponseSender?: (sendResponse: SendResponse) => void

  /**
   * Optional function that is called when Cerberus receives a new connection
   * @param connection The new connection
   * @showindocs
   */
  handleConnection?: (connection: CerberusConnection) => (HandleConnectionReturnType
      |Promise<HandleConnectionReturnType>)

  /**
   * Optional function to handle requests
   * @param request The request to handle
   * @showindocs
   */
  handleRequest?: (request: CerberusRequest) => (HandleRequestReturnType|Promise<HandleRequestReturnType>)

  /**
   * Optional function to handle responses
   * @param response The response to handle
   * @showindocs
   */
  handleResponse?: (response: CerberusResponse) => (HandleResponseReturnType|Promise<HandleResponseReturnType>)
}
