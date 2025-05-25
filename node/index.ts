import type { IPlocationOptions } from '../types'
import { defineValaxyAddon } from 'valaxy'
import pkg from '../package.json'

export const addonIPlocation = defineValaxyAddon<IPlocationOptions>(options => ({
  name: pkg.name,
  enable: true,
  options,
}))