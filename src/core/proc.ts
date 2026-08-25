import { spawn, spawnSync } from 'node:child_process'

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

/** Run a command and capture its output. Never throws on a non-zero exit. */
export function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv; input?: string } = {}): RunResult {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    input: opts.input,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  return {
    code: res.status ?? 1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? (res.error ? String(res.error.message) : ''),
  }
}

/** Run a command with stdio inherited (streams straight to the terminal). */
export function runInherit(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): number {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    stdio: 'inherit',
  })
  return res.status ?? 1
}

/** Attach an interactive session; resolves with the exit code when it ends. */
export function attach(cmd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: env ?? process.env })
    // While attached, the child owns the terminal: don't let Ctrl-C kill the CLI.
    const onSigint = () => {}
    process.on('SIGINT', onSigint)
    child.on('exit', (code, signal) => {
      process.off('SIGINT', onSigint)
      resolve(code ?? (signal ? 130 : 1))
    })
    child.on('error', () => {
      process.off('SIGINT', onSigint)
      resolve(127)
    })
  })
}

export function which(cmd: string): string | null {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' })
  if (res.status !== 0) return null
  const first = (res.stdout ?? '').split('\n')[0]?.trim()
  return first || null
}
