import fs from 'node:fs'
import path from 'node:path'
import type { Backend, CreateOptions } from './types.js'
import type { SpaceManifest } from '../core/state.js'
import { attach as attachProc, run, runInherit, which } from '../core/proc.js'
import { dockerDir } from '../core/paths.js'
import { log } from '../core/log.js'

const CONTAINER_PREFIX = 'agentspace-'
const containerName = (space: string) => `${CONTAINER_PREFIX}${space}`

function bin(): string {
  return process.env.AGENTSPACE_CONTAINER || 'container'
}

/**
 * Apple's `container` runtime (macOS 26+): a real Linux container in its own
 * lightweight VM, driven entirely from the terminal. Same isolation story as
 * Docker with no desktop application to keep running — the API server is a
 * background helper started on demand by `container system start`.
 */
export class AppleBackend implements Backend {
  readonly name = 'apple' as const

  unavailableReason(): string | null {
    if (process.platform !== 'darwin') return 'Apple `container` only exists on macOS'
    if (!which(bin())) {
      return 'the `container` command was not found (install it with `brew install container`)'
    }
    const status = run(bin(), ['system', 'status'])
    if (status.code !== 0 || !/running/.test(status.stdout)) {
      return 'the container system is not running (start it with `container system start`)'
    }
    return null
  }

  private imageExists(image: string): boolean {
    const res = run(bin(), ['image', 'inspect', image])
    return res.code === 0
  }

  async prepare(image: string, opts: { rebuild?: boolean } = {}): Promise<void> {
    if (this.imageExists(image) && !opts.rebuild) return
    const context = dockerDir()
    if (!fs.existsSync(path.join(context, 'Dockerfile'))) {
      throw new Error(`cannot find the agentspace Dockerfile at ${context}`)
    }
    log.step(`building the base image ${image} (first run only, ~3 min)...`)
    const args = ['build', '-t', image, '-f', path.join(context, 'Dockerfile')]
    if (opts.rebuild) args.push('--no-cache')
    args.push(context)
    const code = runInherit(bin(), args)
    if (code !== 0) throw new Error('container build failed — see the output above')
    log.ok(`image ${image} ready`)
  }

  async create(opts: CreateOptions): Promise<string> {
    const name = containerName(opts.name)
    // A stale container from a crashed session would take the name.
    run(bin(), ['delete', '-f', name])

    const args = [
      'run', '-d',
      '--name', name,
      '-l', 'agentspace=1',
      '-l', `agentspace.space=${opts.name}`,
      '-v', `${opts.workspace}:/workspace`,
      '-v', `${opts.control}:/run/agentspace`,
      '-w', '/workspace',
      '-m', normalizeMemory(opts.memory),
      '-c', opts.cpus,
      '--cap-drop', 'ALL',
      '--init',
    ]

    // Apple's runtime has no "none" driver; an unattached container gets
    // loopback only, which is exactly the offline policy.
    if (opts.network === 'none') args.push('--network', 'none', '--no-dns')

    for (const [key, value] of Object.entries(opts.env)) {
      args.push('-e', `${key}=${value}`)
    }

    args.push(opts.image, 'sleep', 'infinity')

    const res = run(bin(), args)
    if (res.code !== 0) {
      throw new Error(`failed to start the container:\n${res.stderr.trim() || res.stdout.trim()}`)
    }
    return res.stdout.trim() || name
  }

  isRunning(space: SpaceManifest): boolean {
    const res = run(bin(), ['ls', '-a', '--format', 'json'])
    if (res.code !== 0) return false
    try {
      const rows = JSON.parse(res.stdout) as AppleListRow[]
      const wanted = containerName(space.name)
      const row = rows.find((r) => (r.id ?? r.configuration?.id) === wanted)
      return row?.status?.state === 'running'
    } catch {
      return false
    }
  }

  async attach(space: SpaceManifest): Promise<number> {
    return attachProc(bin(), [
      'exec', '-it', '-w', '/workspace',
      containerName(space.name),
      '/bin/bash', '--rcfile', '/home/agent/.bashrc', '-i',
    ])
  }

  async exec(space: SpaceManifest, argv: string[]): Promise<number> {
    const flags = process.stdin.isTTY ? ['-it'] : ['-i']
    return attachProc(bin(), [
      'exec', ...flags, '-w', '/workspace',
      containerName(space.name),
      '/bin/bash', '-lc', argv.join(' '),
    ])
  }

  async destroy(space: SpaceManifest): Promise<void> {
    run(bin(), ['delete', '-f', containerName(space.name)])
  }
}

interface AppleListRow {
  id?: string
  configuration?: { id?: string }
  status?: { state?: string }
}

/** Docker accepts "4g"; Apple's runtime wants an explicit binary suffix. */
function normalizeMemory(value: string): string {
  const match = /^(\d+(?:\.\d+)?)\s*([kmgtp])?i?b?$/i.exec(value.trim())
  if (!match) return value
  const [, amount, unit] = match
  return unit ? `${amount}${unit.toUpperCase()}` : `${amount}`
}
