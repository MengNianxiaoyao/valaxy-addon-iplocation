import type { ValaxyAddon } from 'valaxy'
import type { IPlocationOptions } from '../types'
import { useRuntimeConfig } from 'valaxy'
import { computed } from 'vue'

/**
 * get addon config
 */
export function useAddonIPlocation() {
  const runtimeConfig = useRuntimeConfig()
  return computed<IPlocationOptions>(() => {
    const options = (runtimeConfig.value.addons['valaxy-addon-iplocation'] as ValaxyAddon<IPlocationOptions>).options
    if (!options) {
      console.warn('`valaxy-addon-iplocation` options not found')
      return { api: '' }
    }

    return {
      ...options,
      data: options.data ?? "ip-api",
    }
  })
}