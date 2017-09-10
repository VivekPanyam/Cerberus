import {AMQPBackend} from "./amqp"
import {HTTPBackend} from "./http"
import {ZMQBackend} from "./zmq"

export let Backends = {
  HTTPBackend,
  ZMQBackend,
  AMQPBackend,
}
