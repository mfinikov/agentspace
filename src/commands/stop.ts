import pc from 'picocolors'
import { getBackend } from '../backends/index.js'
import { log, UserError } from '../core/log.js'
import { getCurrent, listSpaces, readManifest, setCurrent } from '../core/state.js'
import { run, which } from '../core/proc.js'
import { Args } from '../cli-args.js'

/**
 * Halt a space's environment while keeping its files. The point is memory: a
 * running container VM costs a few hundred MB even when idle.
 */
export async function cmdStop(args: Args): Promise<number> {
  const all = args.bool('all')
  const targets = all
    ? listSpaces().map((s) => s.name)
    : args.positional.length
      ? args.positional
      : [getCurrent()].filter(Boolean) as string[]

  if (!targets.length) {
    // `--all` with no spaces is a success, not a usage error.
    if (all) {
      log.info('no spaces to stop')
      reclaimBuilders()
      return 0
    }
    throw new UserError('nothing to stop', 'usage: abox stop [name...] | abox stop --all')
  }

  let stopped = 0
  for (const target of targets) {
    const space = readManifest(target)
    if (!space) {
      log.warn(`space "${target}" not found — skipping`)
      continue
    }
    const backend = getBackend(space.backend)
    if (!backend.isRunning(space)) continue
    await backend.stop(space)
    stopped++
    log.ok(`stopped ${pc.bold(space.name)} — files kept, memory released`)
  }

  if (stopped === 0) log.info('nothing was running')
  if (targets.includes(getCurrent() ?? '')) setCurrent(null)

  if (all) reclaimBuilders()
  return 0
}

/**
 * Stop everything agentspace can cause to run: every space, plus the build VM
 * that Apple's runtime leaves resident after an image build.
 */
export async function cmdDown(_args: Args): Promise<number> {
  await cmdStop(new Args(['--all']))
  log.blank()
  log.dim('  the container runtime itself is still up')
  log.dim('  shut it down completely with: container system stop')
  return 0
}

function reclaimBuilders(): void {
  if (!which('container')) return
  if (run('container', ['builder', 'stop']).code === 0) {
    log.ok('stopped the build VM (~2GB)')
  }
}
