import pc from 'picocolors'
import { getBackend } from '../backends/index.js'
import { log, UserError } from '../core/log.js'
import { workspaceDir } from '../core/paths.js'
import { summary } from '../core/session.js'
import { dirSize, formatBytes, getCurrent, listSpaces, readManifest } from '../core/state.js'
import type { Args } from '../cli-args.js'

export async function cmdStatus(args: Args): Promise<number> {
  const target = args.positional[0] ?? getCurrent()
  if (!target) {
    const spaces = listSpaces()
    log.info(spaces.length ? `no current space (${spaces.length} exist — see \`apen ls\`)` : 'no spaces yet')
    return 0
  }

  const space = readManifest(target)
  if (!space) throw new UserError(`space "${target}" not found`, 'see `apen ls`')

  const backend = getBackend(space.backend)
  log.blank()
  log.info(summary(space))
  log.info(`${pc.bold('state')}     ${backend.isRunning(space) ? pc.green('running') : pc.dim('stopped')}`)
  log.info(`${pc.bold('size')}      ${formatBytes(dirSize(workspaceDir(space.name)))}`)
  log.info(`${pc.bold('created')}   ${space.createdAt}`)
  if (space.lastEnteredAt) log.info(`${pc.bold('entered')}   ${space.lastEnteredAt}`)
  log.blank()

  if (space.ephemeral) {
    log.dim('  this space is ephemeral — `apen leave` deletes everything above')
    log.dim(`  to keep it instead: apen leave --keep`)
  }
  return 0
}
