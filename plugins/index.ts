import {AnalyticsPlugins} from "./analytics"
import {AuthenticationPlugins} from "./authentication"
import {CachePlugins} from "./cache"
import {TrafficPlugins} from "./traffic"

// Combine all the plugins into a flat map
export let Plugins = {
    ...AnalyticsPlugins,
    ...AuthenticationPlugins,
    ...CachePlugins,
    ...TrafficPlugins,
}
