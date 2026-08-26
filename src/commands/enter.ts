import pc from 'picocolors'
import { getBackend } from '../backends/index.js'
import { controlDir } from '../core/control.js'
import { log, UserError } from '../core/log.js'
import { workspaceDir } from '../core/paths.js'
import { runSession } from '../core/session.js'
import { getCurrent, listSpaces, readManifest, updateManifest } from '../core/state.js'
import { loadConfig } from '../core/config.js'
import type { Args } from '../cli-args.js'

function resolveTarget(args: Args): string {
  const explicit = args.positional[0] ?? getCurrent()
  if (explicit) return explicit
  const spaces = listSpaces()
  if (spaces.length === 1) return spaces[0]!.name
  throw new UserError(
    spaces.length ? 'which space?' : 'there are no spaces yet',
    spaces.length
      ? `pick one: ${spaces.map((s) => s.name).join(', ')}`
      : 'create one with `abox new`',
  )
}

function forwardedEnv(name: string, keys: string[]): Record<string, string> {
  const env: Record<string, string> = {
    AGENTSPACE: '1',
    AGENTSPACE_INSIDE: '1',
    AGENTSPACE_NAME: name,
  }
  for (const key of keys) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  return env
}

export async function cmdEnter(args: Args): Promise<number> {
  const target = resolveTarget(args)
  const space = readManifest(target)
  if (!space) throw new UserError(`space "${target}" not found`, 'see `abox ls`')

  const backend = getBackend(space.backend)
  const reason = backend.unavailableReason()
  if (reason) throw new UserError(`cannot enter ${space.name}: ${reason}`)

  if (!backend.isRunning(space)) {
    log.step(`starting ${pc.bold(space.name)}...`)
    const cfg = loadConfig()
    const handle = await backend.create({
      name: space.name,
      workspace: workspaceDir(space.name),
      control: controlDir(space.name),
      network: space.network,
      image: space.image ?? cfg.image,
      memory: cfg.memory,
      cpus: cfg.cpus,
      env: forwardedEnv(space.name, cfg.forwardEnv),
    })
    updateManifest(space.name, { handle })
    space.handle = handle
  }

  return runSession(space, backend)
}

export async function cmdExec(args: Args): Promise<number> {
  const target = args.string('space') ?? getCurrent() ?? resolveTarget(args)
  const space = readManifest(target)
  if (!space) throw new UserError(`space "${target}" not found`, 'see `abox ls`')

  const argv = args.passthrough.length ? args.passthrough : args.positional
  if (!argv.length) {
    throw new UserError('nothing to run', 'usage: abox exec [--space <name>] -- <command>')
  }

  const backend = getBackend(space.backend)
  if (!backend.isRunning(space)) {
    throw new UserError(
      `${space.name} is not running`,
      `start it with \`abox enter ${space.name}\``,
    )
  }
  return backend.exec(space, argv, {
    workspace: workspaceDir(space.name),
    control: controlDir(space.name),
  })
}
