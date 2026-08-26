import pc from 'picocolors'
import {
  DEFAULT_CONFIG,
  configKeys,
  loadConfig,
  parseConfigValue,
  saveConfig,
} from '../core/config.js'
import { log, UserError } from '../core/log.js'
import { configPath } from '../core/paths.js'
import type { Args } from '../cli-args.js'

export async function cmdConfig(args: Args): Promise<number> {
  const [action, key, ...rest] = args.positional

  if (!action || action === 'list' || action === 'get') {
    const cfg = loadConfig()
    if (action === 'get' && key) {
      const value = cfg[key as keyof typeof cfg]
      if (value === undefined) throw new UserError(`unknown config key "${key}"`)
      console.log(Array.isArray(value) ? value.join(',') : String(value))
      return 0
    }
    log.blank()
    for (const k of configKeys()) {
      const value = cfg[k]
      const shown = Array.isArray(value) ? value.join(',') || '(none)' : String(value)
      const isDefault =
        JSON.stringify(value) === JSON.stringify(DEFAULT_CONFIG[k as keyof typeof DEFAULT_CONFIG])
      log.info(`  ${k.padEnd(14)}${shown}${isDefault ? pc.dim('  (default)') : ''}`)
    }
    log.blank()
    log.dim(`  ${configPath()}`)
    return 0
  }

  if (action === 'set') {
    if (!key) throw new UserError('usage: apen config set <key> <value>')
    const inline = key.includes('=')
    const name = inline ? key.slice(0, key.indexOf('=')) : key
    const value = inline ? key.slice(key.indexOf('=') + 1) : rest.join(' ')
    if (!value) throw new UserError(`usage: apen config set ${name} <value>`)
    saveConfig(parseConfigValue(name, value))
    log.ok(`${name} = ${value}`)
    return 0
  }

  if (action === 'reset') {
    saveConfig(DEFAULT_CONFIG)
    log.ok('config reset to defaults')
    return 0
  }

  throw new UserError(
    `unknown config action "${action}"`,
    'usage: apen config [list|get <key>|set <key> <value>|reset]',
  )
}
