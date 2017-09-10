import {SendResponse} from "../cerberus"
import {CerberusConnection} from "../routing/connection"
import {CerberusRequest} from "../routing/request"

/**
 * Backend Interface
 * @showindocs
 */
export interface IBackend {
  /**
   * Called by `Cerberus.addFrontend` when this backend is enabled
   * @param sendResponse A function that should be called  when the backend receives a response
   * @showindocs
   */
  enable: (sendResponse: SendResponse) => void

  /**
   * Optional function that is called when a frontend receives a new connection
   * @param connection The new connection
   * @showindocs
   */
  handleConnection?: (connection: CerberusConnection) => void

  /**
   * Handle a request and send a response using `sendResponse`
   * @param request The request to handle
   * @showindocs
   */
  handleRequest: (request: CerberusRequest) => void
}
