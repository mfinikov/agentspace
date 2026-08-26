import fs from 'node:fs'
import pc from 'picocolors'
import type { Backend } from '../backends/index.js'
import { getBackend } from '../backends/index.js'
import { loadConfig } from './config.js'
import { controlDir, readLeaveRequest, clearLeaveRequest, writeControl } from './control.js'
import { log } from './log.js'
import { confirm } from './prompt.js'
import {
  dirSize,
  formatBytes,
  removeSpaceDir,
  setCurrent,
  updateManifest,
  type SpaceManifest,
} from './state.js'
import { workspaceDir } from './paths.js'

/**
 * Say exactly what the network policy buys, per backend. Verified by probing a
 * live host service from inside each: a container on `full` CAN reach services
 * on this machine over its LAN address, while the Seatbelt sandbox refuses
 * every connection to a local address. Do not soften this into a guarantee the
 * runtime does not make.
 */
export function networkDescription(space: SpaceManifest): string {
  if (space.network === 'none') return 'no network at all'
  return space.backend === 'native'
    ? 'internet only — this machine is unreachable'
    : 'internet and your local network — including services on this machine'
}

export function motd(space: SpaceManifest): string {
  const net =
    space.network === 'none'
      ? 'offline'
      : space.backend === 'native'
        ? 'internet only'
        : 'internet + your local network'
  const life = space.ephemeral ? 'destroyed on leave' : 'kept on leave'
  return [
    '',
    pc.cyan(`  agentspace · ${space.name}`),
    pc.dim(`  ${space.backend} · ${net} · ${life}`),
    '',
    pc.dim('  /workspace is shared with your machine. Nothing else here is.'),
    pc.dim('  read AGENTS.md first · aspace status · aspace leave'),
    '',
  ].join('\n')
}

export function summary(space: SpaceManifest): string {
  const ws = workspaceDir(space.name)
  return [
    `${pc.bold('space')}     ${space.name}`,
    `${pc.bold('backend')}   ${space.backend}`,
    `${pc.bold('network')}   ${networkDescription(space)}`,
    `${pc.bold('workspace')} ${ws}`,
    `${pc.bold('lifetime')}  ${space.ephemeral ? 'ephemeral — destroyed on leave' : 'persistent — kept on leave'}`,
  ].join('\n')
}

/**
 * Attach an interactive shell, then honour whatever the user asked for on the
 * way out: an explicit `aspace leave`, or a bare `exit` we have to interpret.
 */
export async function runSession(space: SpaceManifest, backend: Backend): Promise<number> {
  const control = writeControl(space, motd(space))
  const workspace = workspaceDir(space.name)
  setCurrent(space.name)
  updateManifest(space.name, { lastEnteredAt: new Date().toISOString() })

  const code = await backend.attach(space, { workspace, control })

  const request = readLeaveRequest(space.name)
  clearLeaveRequest(space.name)

  if (request === 'keep') {
    await detach(space, backend)
    return code
  }
  if (request === 'destroy') {
    await destroySpace(space, backend, { force: true })
    return code
  }

  // The shell ended without `aspace leave` — Ctrl-D, `exit`, or a crash.
  if (!space.ephemeral) {
    await detach(space, backend)
    return code
  }

  const cfg = loadConfig()
  const size = formatBytes(dirSize(workspace))
  log.blank()
  log.info(`the shell ended without ${pc.cyan('aspace leave')}.`)
  const destroy = cfg.confirmOnLeave
    ? await confirm(`destroy ${pc.bold(space.name)} and its ${size} of files?`, false)
    : true

  if (destroy) await destroySpace(space, backend, { force: true })
  else await detach(space, backend)
  return code
}

export async function detach(space: SpaceManifest, backend: Backend): Promise<void> {
  // Keeping a space must not mean keeping a VM resident. `enter` restarts it.
  await backend.stop(space)
  setCurrent(null)
  log.blank()
  log.ok(`left ${pc.bold(space.name)} — files kept, environment stopped`)
  log.dim(`  files:  ${workspaceDir(space.name)}`)
  log.dim(`  return: aspace enter ${space.name}`)
  log.dim(`  delete: aspace rm ${space.name}`)
}

export interface DestroyOptions {
  force?: boolean
}

export async function destroySpace(
  space: SpaceManifest,
  backend?: Backend,
  opts: DestroyOptions = {},
): Promise<void> {
  const be = backend ?? getBackend(space.backend)
  const workspace = workspaceDir(space.name)
  const size = fs.existsSync(workspace) ? formatBytes(dirSize(workspace)) : '0B'

  if (!opts.force) {
    const ok = await confirm(
      `destroy ${pc.bold(space.name)}? ${size} of files will be deleted permanently.`,
      false,
    )
    if (!ok) {
      log.info('kept.')
      return
    }
  }

  await be.destroy(space)
  removeSpaceDir(space.name)
  setCurrent(null)
  fs.rmSync(controlDir(space.name), { recursive: true, force: true })
  log.blank()
  log.ok(`destroyed ${pc.bold(space.name)} — ${size} gone, nothing left behind`)
}
