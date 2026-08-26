import pc from 'picocolors'
import { getBackend } from '../backends/index.js'
import { log, UserError } from '../core/log.js'
import { detach, destroySpace } from '../core/session.js'
import { getCurrent, readManifest } from '../core/state.js'
import type { Args } from '../cli-args.js'

export async function cmdLeave(args: Args): Promise<number> {
  // Inside a space, `apen leave` is handled by the shell function in the
  // image. Reaching the host binary from inside means the shim is missing.
  if (process.env.AGENTSPACE_INSIDE === '1') {
    log.warn('this looks like the host CLI running inside a space')
    log.dim('  type `exit` to end the shell — the host will then clean up')
    return 1
  }

  const target = args.positional[0] ?? getCurrent()
  if (!target) {
    throw new UserError(
      'no space to leave',
      'you are not in a space. `apen ls` shows what exists.',
    )
  }

  const space = readManifest(target)
  if (!space) throw new UserError(`space "${target}" not found`, 'see `apen ls`')

  const backend = getBackend(space.backend)

  if (args.bool('keep') || !space.ephemeral) {
    await detach(space, backend)
    return 0
  }

  await destroySpace(space, backend, { force: args.bool('force') || args.bool('yes') })
  return 0
}

export async function cmdRm(args: Args): Promise<number> {
  const targets = args.positional.length ? args.positional : [getCurrent()].filter(Boolean) as string[]
  if (!targets.length) throw new UserError('nothing to remove', 'usage: apen rm <space>')

  for (const target of targets) {
    const space = readManifest(target)
    if (!space) {
      log.warn(`space "${target}" not found — skipping`)
      continue
    }
    await destroySpace(space, getBackend(space.backend), {
      force: args.bool('force') || args.bool('yes'),
    })
  }
  return 0
}

export async function cmdPrune(args: Args): Promise<number> {
  const { listSpaces } = await import('../core/state.js')
  const spaces = listSpaces().filter((s) => s.ephemeral)
  if (!spaces.length) {
    log.info('no ephemeral spaces to prune')
    return 0
  }
  log.info(`pruning ${spaces.length} ephemeral space(s): ${spaces.map((s) => pc.bold(s.name)).join(', ')}`)
  for (const space of spaces) {
    await destroySpace(space, getBackend(space.backend), {
      force: args.bool('force') || args.bool('yes'),
    })
  }
  return 0
}
