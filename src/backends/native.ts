import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { Backend, CreateOptions } from './types.js'
import type { SpaceManifest } from '../core/state.js'
import { attach as attachProc, which } from '../core/proc.js'

/**
 * macOS-only fallback that uses the Seatbelt sandbox (`sandbox-exec`).
 *
 * It is weaker than the container backend — the process still runs on the host
 * kernel with the host's binaries — but it confines filesystem writes to the
 * workspace and blocks reads of the user's home directory, which covers the
 * main risk: an agent wandering outside its folder. Use it when Docker is not
 * available; `aspace doctor` says so out loud.
 */
export class NativeBackend implements Backend {
  readonly name = 'native' as const

  unavailableReason(): string | null {
    if (process.platform !== 'darwin') {
      return 'the native backend only exists on macOS (use the docker backend)'
    }
    if (!which('sandbox-exec')) return '`sandbox-exec` was not found on this machine'
    return null
  }

  async prepare(): Promise<void> {
    // Nothing to build — the host toolchain is the environment.
  }

  private profilePath(control: string): string {
    return path.join(control, 'sandbox.sb')
  }

  private writeProfile(opts: { workspace: string; control: string; network: 'none' | 'full' }): string {
    const allowRead = [
      '/usr', '/bin', '/sbin', '/opt', '/System', '/Library', '/private/var/db',
      '/private/etc', '/dev', '/tmp', '/private/tmp', '/var',
    ]
    const profile = `(version 1)
(deny default)
(allow process-exec process-fork signal)
(allow sysctl-read mach-lookup ipc-posix-shm)
(allow file-read-metadata)

; Read-only access to the system so ordinary tooling still runs.
${allowRead.map((p) => `(allow file-read* (subpath "${p}"))`).join('\n')}

; The workspace is the only writable place — this is the whole point.
(allow file-read* file-write* (subpath "${opts.workspace}"))
(allow file-read* file-write* (subpath "${opts.control}"))
(allow file-write* (subpath "/private/tmp"))
(allow file-write* (subpath "/private/var/folders"))

; Never let the sandbox read the user's files outside the workspace.
(deny file-read* (subpath "${os.homedir()}"))
(allow file-read* (subpath "${opts.workspace}"))

${opts.network === 'full' ? '(allow network*)' : '(deny network*)'}
`
    const file = this.profilePath(opts.control)
    fs.writeFileSync(file, profile)
    return file
  }

  async create(opts: CreateOptions): Promise<string> {
    this.writeProfile(opts)
    return `native:${opts.name}`
  }

  isRunning(): boolean {
    // Native spaces have no daemon: the sandbox lives only while a shell is attached.
    return true
  }

  private env(space: SpaceManifest, workspace: string): NodeJS.ProcessEnv {
    return {
      ...process.env,
      AGENTSPACE: '1',
      AGENTSPACE_INSIDE: '1',
      AGENTSPACE_NAME: space.name,
      HOME: path.join(workspace, '.home'),
      PS1: `aspace:${space.name} \\W $ `,
    }
  }

  async attach(space: SpaceManifest, o: { workspace: string; control: string }): Promise<number> {
    fs.mkdirSync(path.join(o.workspace, '.home'), { recursive: true })
    return attachProc(
      'sandbox-exec',
      ['-f', this.profilePath(o.control), '/bin/bash', '--noprofile', '--norc', '-i'],
      { ...this.env(space, o.workspace), PWD: o.workspace },
    )
  }

  async exec(space: SpaceManifest, argv: string[], o: { workspace: string; control: string }): Promise<number> {
    return attachProc(
      'sandbox-exec',
      ['-f', this.profilePath(o.control), '/bin/bash', '-c', `cd ${JSON.stringify(o.workspace)} && ${argv.join(' ')}`],
      this.env(space, o.workspace),
    )
  }

  async destroy(): Promise<void> {
    // The sandbox has no residue beyond the space directory, which the caller removes.
  }
}
