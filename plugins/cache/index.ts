import {LRUCache} from "./lru"
import {RedisCache} from "./redis"

export let CachePlugins = {
    LRUCache,
    RedisCache,
}
