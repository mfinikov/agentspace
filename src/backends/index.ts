import type { Backend } from './types.js'
import { DockerBackend } from './docker.js'
import { NativeBackend } from './native.js'
import type { BackendName, Config } from '../core/config.js'
import { UserError } from '../core/log.js'

export type { Backend, CreateOptions } from './types.js'

const registry: Record<BackendName, Backend> = {
  docker: new DockerBackend(),
  native: new NativeBackend(),
}

export function getBackend(name: BackendName): Backend {
  return registry[name]
}

export function allBackends(): Backend[] {
  return [registry.docker, registry.native]
}

/**
 * Resolve which backend to use. `auto` prefers docker (true container-level
 * isolation) and only falls back to the weaker native sandbox if docker cannot
 * run — and says so, because the guarantee is different.
 */
export function resolveBackend(
  preference: Config['backend'],
  onFallback?: (reason: string) => void,
): { backend: Backend; name: BackendName } {
  if (preference !== 'auto') {
    const backend = registry[preference]
    const reason = backend.unavailableReason()
    if (reason) {
      throw new UserError(
        `the "${preference}" backend cannot run here: ${reason}`,
        'run `aspace doctor` to see what is available',
      )
    }
    return { backend, name: preference }
  }

  const dockerReason = registry.docker.unavailableReason()
  if (!dockerReason) return { backend: registry.docker, name: 'docker' }

  const nativeReason = registry.native.unavailableReason()
  if (!nativeReason) {
    onFallback?.(dockerReason)
    return { backend: registry.native, name: 'native' }
  }

  throw new UserError(
    `no isolation backend is available on this machine`,
    `docker: ${dockerReason}\n  native: ${nativeReason}`,
  )
}
