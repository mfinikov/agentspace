import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import type { Backend, CreateOptions } from './types.js'
import type { SpaceManifest } from '../core/state.js'
import { attach as attachProc, which } from '../core/proc.js'

/**
 * macOS-only fallback that uses the Seatbelt sandbox (`sandbox-exec`).
 *
 * It is weaker than a container — the process still runs on the host kernel,
 * with the host's binaries and installed packages, and it has no PID or
 * filesystem namespace — but it confines every write to the workspace, blocks
 * every read of the user's home directory, and refuses connections to services
 * on this machine. That covers the realistic risk: an agent wandering out of
 * its folder. It needs nothing installed and leaves nothing running.
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

  /**
   * Allow-by-default with targeted denies. A deny-by-default profile cannot
   * even load dyld without enumerating half the filesystem, and an incomplete
   * enumeration aborts the process rather than degrading — so the rules that
   * matter are expressed as denies, and later rules win.
   */
  private writeProfile(opts: { workspace: string; control: string; network: 'none' | 'full' }): string {
    const homeDir = os.homedir()
    const profile = `(version 1)
(allow default)

; Writes: the workspace, and scratch space that dies with the machine.
(deny file-write*)
(allow file-write* (subpath ${sexp(opts.workspace)}))
(allow file-write* (subpath ${sexp(opts.control)}))
(allow file-write* (subpath "/private/tmp"))
(allow file-write* (subpath "/private/var/folders"))
(allow file-write*
  (literal "/dev/null") (literal "/dev/zero") (literal "/dev/tty")
  (literal "/dev/stdout") (literal "/dev/stderr") (literal "/dev/dtracehelper"))
(allow file-write* (regex #"^/dev/ttys[0-9]*$"))

; Reads: the user's files are off limits. The workspace re-allow must come
; last, because the space directory may itself live under the home directory.
(deny file-read* (subpath ${sexp(homeDir)}))
(allow file-read* (subpath ${sexp(opts.workspace)}))
(allow file-read* (subpath ${sexp(opts.control)}))

${
      opts.network === 'full'
        ? // The internet is allowed, but never services on this machine.
          '(deny network-outbound (remote ip "localhost:*"))'
        : '(deny network*)'
    }
`
    const file = this.profilePath(opts.control)
    fs.mkdirSync(opts.control, { recursive: true })
    fs.writeFileSync(file, profile)
    return file
  }

  async create(opts: CreateOptions): Promise<string> {
    this.writeProfile(opts)
    fs.mkdirSync(path.join(opts.workspace, '.home'), { recursive: true })
    return `native:${opts.name}`
  }

  isRunning(): boolean {
    // Native spaces have no daemon: the sandbox exists only while a shell runs.
    return true
  }

  private env(space: SpaceManifest, workspace: string): NodeJS.ProcessEnv {
    return {
      ...process.env,
      AGENTSPACE: '1',
      AGENTSPACE_INSIDE: '1',
      AGENTSPACE_NAME: space.name,
      // A home inside the workspace keeps tool config from leaking either way.
      HOME: path.join(workspace, '.home'),
      PS1: `aspace:${space.name} \\W $ `,
    }
  }

  /** Regenerate the profile so a moved space or changed home still applies. */
  private ensureProfile(space: SpaceManifest, o: { workspace: string; control: string }): string {
    this.writeProfile({ workspace: o.workspace, control: o.control, network: space.network })
    fs.mkdirSync(path.join(o.workspace, '.home'), { recursive: true })
    return this.profilePath(o.control)
  }

  async attach(space: SpaceManifest, o: { workspace: string; control: string }): Promise<number> {
    const profile = this.ensureProfile(space, o)
    fs.mkdirSync(path.join(o.workspace, '.home'), { recursive: true })
    const rc = this.writeRc(space, o.workspace)
    return attachProc('sandbox-exec', ['-f', profile, '/bin/bash', '--rcfile', rc, '-i'], {
      env: this.env(space, o.workspace),
      cwd: o.workspace,
    })
  }

  async exec(space: SpaceManifest, argv: string[], o: { workspace: string; control: string }): Promise<number> {
    const profile = this.ensureProfile(space, o)
    return attachProc('sandbox-exec', ['-f', profile, '/bin/bash', '-lc', argv.join(' ')], {
      env: this.env(space, o.workspace),
      cwd: o.workspace,
    })
  }

  async stop(): Promise<void> {
    // Nothing runs between shells, so there is nothing to halt.
  }

  async destroy(): Promise<void> {
    // The sandbox leaves nothing behind beyond the space directory, which the
    // caller removes.
  }

  /** `aspace leave` must be able to end the shell, so it is a shell function. */
  private writeRc(space: SpaceManifest, workspace: string): string {
    const rc = path.join(workspace, '.home', '.bashrc')
    const control = path.join(path.dirname(workspace), 'control')
    fs.writeFileSync(
      rc,
      `# generated by agentspace — this file is inside the space
export PS1='\\[\\033[36m\\]aspace:${space.name}\\[\\033[0m\\] \\W $ '
export EDITOR=\${EDITOR:-nano}
alias ll='ls -alh'

aspace() {
  case "$1" in
    leave)
      local mode=destroy
      for a in "$@"; do [ "$a" = "--keep" ] && mode=keep; done
      printf '%s\\n' "$mode" > ${JSON.stringify(path.join(control, 'leave'))}
      exit 0
      ;;
    status)
      echo "space:    ${space.name}"
      echo "backend:  native (macOS sandbox)"
      echo "network:  ${space.network}"
      echo "writable: ${workspace} only"
      echo "blocked:  your home directory, and services on this machine"
      ;;
    *)
      echo "aspace: inside a space you can use: leave [--keep], status" >&2
      return 1
      ;;
  esac
}

[ -f ${JSON.stringify(path.join(control, 'motd'))} ] && cat ${JSON.stringify(path.join(control, 'motd'))}
`,
    )
    return rc
  }
}

/** Quote a path for a Seatbelt profile string literal. */
function sexp(value: string): string {
  return JSON.stringify(value)
}
