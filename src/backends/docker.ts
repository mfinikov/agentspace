import fs from 'node:fs'
import path from 'node:path'
import type { Backend, CreateOptions } from './types.js'
import type { SpaceManifest } from '../core/state.js'
import { attach as attachProc, run, runInherit, which } from '../core/proc.js'
import { dockerDir } from '../core/paths.js'
import { log } from '../core/log.js'

const CONTAINER_PREFIX = 'agentspace-'
const containerName = (space: string) => `${CONTAINER_PREFIX}${space}`

function dockerBin(): string {
  return process.env.AGENTSPACE_DOCKER || 'docker'
}

export class DockerBackend implements Backend {
  readonly name = 'docker' as const

  unavailableReason(): string | null {
    if (!which(dockerBin())) return 'the `docker` command was not found on your PATH'
    const ping = run(dockerBin(), ['info', '--format', '{{.ServerVersion}}'])
    if (ping.code !== 0) return 'the Docker daemon is not running (start Docker Desktop and retry)'
    return null
  }

  private imageExists(image: string): boolean {
    return run(dockerBin(), ['image', 'inspect', image]).code === 0
  }

  async prepare(image: string, opts: { rebuild?: boolean } = {}): Promise<void> {
    if (this.imageExists(image) && !opts.rebuild) return
    const context = dockerDir()
    if (!fs.existsSync(path.join(context, 'Dockerfile'))) {
      throw new Error(`cannot find the agentspace Dockerfile at ${context}`)
    }
    log.step(`building the base image ${image} (first run only, ~2 min)…`)
    const args = ['build', '-t', image, '-f', path.join(context, 'Dockerfile')]
    // Match the host uid on Linux so bind-mounted files stay writable both ways.
    if (process.platform === 'linux' && typeof process.getuid === 'function') {
      args.push('--build-arg', `AGENT_UID=${process.getuid()}`)
      if (typeof process.getgid === 'function') {
        args.push('--build-arg', `AGENT_GID=${process.getgid()}`)
      }
    }
    args.push(context)
    const code = runInherit(dockerBin(), args)
    if (code !== 0) throw new Error('docker build failed — see the output above')
    log.ok(`image ${image} ready`)
  }

  async create(opts: CreateOptions): Promise<string> {
    const name = containerName(opts.name)
    // A stale container from a crashed session would block the run.
    run(dockerBin(), ['rm', '-f', name])

    const args = [
      'run', '-d',
      '--name', name,
      '--label', 'agentspace=1',
      '--label', `agentspace.space=${opts.name}`,
      '--hostname', opts.name,
      '-v', `${opts.workspace}:/workspace`,
      '-v', `${opts.control}:/run/agentspace`,
      '-w', '/workspace',
      '--memory', opts.memory,
      '--cpus', opts.cpus,
      '--pids-limit', '2048',
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
      // The space must never be able to reach services on the host machine.
      '--add-host', 'host.docker.internal:127.0.0.1',
      '--add-host', 'gateway.docker.internal:127.0.0.1',
    ]

    args.push('--network', opts.network === 'none' ? 'none' : 'bridge')

    for (const [key, value] of Object.entries(opts.env)) {
      args.push('-e', `${key}=${value}`)
    }

    args.push(opts.image, 'sleep', 'infinity')

    const res = run(dockerBin(), args)
    if (res.code !== 0) {
      throw new Error(`failed to start the container:\n${res.stderr.trim() || res.stdout.trim()}`)
    }
    return res.stdout.trim()
  }

  isRunning(space: SpaceManifest): boolean {
    const res = run(dockerBin(), [
      'inspect', '-f', '{{.State.Running}}', containerName(space.name),
    ])
    return res.code === 0 && res.stdout.trim() === 'true'
  }

  async attach(space: SpaceManifest): Promise<number> {
    return attachProc(dockerBin(), [
      'exec', '-it',
      '-w', '/workspace',
      containerName(space.name),
      '/bin/bash', '--rcfile', '/home/agent/.bashrc', '-i',
    ])
  }

  async exec(space: SpaceManifest, argv: string[]): Promise<number> {
    const interactive = process.stdin.isTTY ? '-it' : '-i'
    return attachProc(dockerBin(), [
      'exec', interactive, '-w', '/workspace', containerName(space.name),
      '/bin/bash', '-lc', argv.join(' '),
    ])
  }

  async stop(space: SpaceManifest): Promise<void> {
    run(dockerBin(), ['stop', '-t', '3', containerName(space.name)])
  }

  async destroy(space: SpaceManifest): Promise<void> {
    run(dockerBin(), ['rm', '-f', '-v', containerName(space.name)])
  }
}
