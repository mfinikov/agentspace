import type { Backend } from './types.js'
import { AppleBackend } from './apple.js'
import { DockerBackend } from './docker.js'
import { NativeBackend } from './native.js'
import type { BackendName, Config } from '../core/config.js'
import { UserError } from '../core/log.js'

export type { Backend, CreateOptions } from './types.js'

const registry: Record<BackendName, Backend> = {
  apple: new AppleBackend(),
  docker: new DockerBackend(),
  native: new NativeBackend(),
}

/**
 * Preference order for `auto`. Apple's runtime comes first because it gives
 * container-grade isolation without a desktop application to keep running;
 * Docker is the portable equivalent; the native sandbox is the zero-install
 * fallback that trades isolation for needing nothing at all.
 */
export const AUTO_ORDER: BackendName[] = ['apple', 'docker', 'native']

export function getBackend(name: BackendName): Backend {
  return registry[name]
}

export function allBackends(): Backend[] {
  return AUTO_ORDER.map((name) => registry[name])
}

export function resolveBackend(
  preference: Config['backend'],
  onFallback?: (chosen: BackendName, skipped: { name: BackendName; reason: string }[]) => void,
): { backend: Backend; name: BackendName } {
  if (preference !== 'auto') {
    const backend = registry[preference]
    const reason = backend.unavailableReason()
    if (reason) {
      throw new UserError(
        `the "${preference}" backend cannot run here: ${reason}`,
        'run `apen doctor` to see what is available',
      )
    }
    return { backend, name: preference }
  }

  const skipped: { name: BackendName; reason: string }[] = []
  for (const name of AUTO_ORDER) {
    const backend = registry[name]
    const reason = backend.unavailableReason()
    if (!reason) {
      if (skipped.length) onFallback?.(name, skipped)
      return { backend, name }
    }
    skipped.push({ name, reason })
  }

  throw new UserError(
    'no isolation backend is available on this machine',
    skipped.map((s) => `${s.name}: ${s.reason}`).join('\n  '),
  )
}
