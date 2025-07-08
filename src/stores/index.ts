import { createPinia } from 'pinia'
// Pinia 状态持久化插件
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import useSystemStore from './modules/system'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export { useSystemStore }
export type { ThemeMode } from './modules/system'
export default pinia
