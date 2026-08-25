import fs from 'node:fs'
import { configPath, ensureHome } from './paths.js'

export type NetworkMode = 'none' | 'full'
export type BackendName = 'docker' | 'native'

export interface Config {
  /** Preferred isolation backend. `auto` picks docker, else native. */
  backend: BackendName | 'auto'
  /** Default network policy for new spaces. */
  network: NetworkMode
  /** Ask before destroying a space on `aspace leave`. */
  confirmOnLeave: boolean
  /** Container image used by the docker backend. */
  image: string
  /** Memory limit passed to the container runtime, e.g. "4g". */
  memory: string
  /** CPU limit passed to the container runtime, e.g. "2". */
  cpus: string
  /** Env vars forwarded from the host into every new space. */
  forwardEnv: string[]
}

export const DEFAULT_CONFIG: Config = {
  backend: 'auto',
  network: 'full',
  confirmOnLeave: true,
  image: 'agentspace/base:0.1',
  memory: '4g',
  cpus: '2',
  forwardEnv: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'],
}

let cached: Config | null = null

export function loadConfig(): Config {
  if (cached) return cached
  let onDisk: Partial<Config> = {}
  try {
    onDisk = JSON.parse(fs.readFileSync(configPath(), 'utf8')) as Partial<Config>
  } catch {
    // No config yet — defaults are fine.
  }
  cached = { ...DEFAULT_CONFIG, ...onDisk }
  return cached
}

export function saveConfig(patch: Partial<Config>): Config {
  ensureHome()
  const next = { ...loadConfig(), ...patch }
  fs.writeFileSync(configPath(), `${JSON.stringify(next, null, 2)}\n`)
  cached = next
  return next
}

export function configKeys(): (keyof Config)[] {
  return Object.keys(DEFAULT_CONFIG) as (keyof Config)[]
}

/** Parse a `key=value` pair from `aspace config set` into a typed patch. */
export function parseConfigValue(key: string, value: string): Partial<Config> {
  switch (key) {
    case 'backend':
      if (!['auto', 'docker', 'native'].includes(value)) {
        throw new Error(`backend must be one of: auto, docker, native`)
      }
      return { backend: value as Config['backend'] }
    case 'network':
      if (!['none', 'full'].includes(value)) throw new Error(`network must be one of: none, full`)
      return { network: value as NetworkMode }
    case 'confirmOnLeave':
      return { confirmOnLeave: value === 'true' || value === '1' }
    case 'image':
      return { image: value }
    case 'memory':
      return { memory: value }
    case 'cpus':
      return { cpus: value }
    case 'forwardEnv':
      return { forwardEnv: value.split(',').map((s) => s.trim()).filter(Boolean) }
    default:
      throw new Error(`unknown config key "${key}" — known keys: ${configKeys().join(', ')}`)
  }
}
