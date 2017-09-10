import {CreateConnection, SendRequest} from "../cerberus"

/**
 * Frontend Interface
 * @showindocs
 */
export interface IFrontend {
  /**
   * Called by `Cerberus.addFrontend` when this frontend is enabled
   * @param createConnection A function that should be called  when the frontend receives a connection
   * @param sendRequest A function that should be called when the frontend receives a request
   * @showindocs
   */
  enable: (createConnection: CreateConnection, sendRequest: SendRequest) => void
}
