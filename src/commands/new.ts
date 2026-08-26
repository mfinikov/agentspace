import pc from 'picocolors'
import { resolveBackend } from '../backends/index.js'
import { loadConfig, type NetworkMode } from '../core/config.js'
import { assertValidName, generateName, slugify } from '../core/ids.js'
import { log, UserError } from '../core/log.js'
import { writeControl } from '../core/control.js'
import {
  createSpaceDirs,
  removeSpaceDir,
  spaceExists,
  writeManifest,
  type SpaceManifest,
} from '../core/state.js'
import { scaffold, stackDir } from '../core/scaffold.js'
import { motd, runSession, summary } from '../core/session.js'
import type { Args } from '../cli-args.js'

export async function cmdNew(args: Args): Promise<number> {
  const cfg = loadConfig()

  const raw = args.positional[0]
  const name = raw ? slugify(raw) : generateName()
  assertValidName(name)
  if (spaceExists(name)) {
    throw new UserError(
      `a space called "${name}" already exists`,
      `enter it with \`abox enter ${name}\`, or destroy it with \`abox rm ${name}\``,
    )
  }

  const network = (args.string('net') ?? cfg.network) as NetworkMode
  if (network !== 'none' && network !== 'full') {
    throw new UserError(`--net must be "none" or "full", got "${network}"`)
  }

  const preference = (args.string('backend') ?? cfg.backend) as typeof cfg.backend
  const { backend, name: backendName } = resolveBackend(preference, (chosen, skipped) => {
    for (const s of skipped) log.dim(`  ${s.name} unavailable — ${s.reason}`)
    if (chosen === 'native') {
      log.warn('using the native sandbox: it confines the workspace but shares your kernel')
    } else {
      log.dim(`  using ${chosen}`)
    }
  })

  const stack = args.string('stack') ?? 'default'
  const ephemeral = !args.bool('keep')
  const image = args.string('image') ?? cfg.image

  // Fail on a bad stack name before anything is written to disk.
  stackDir(stack)

  log.blank()
  log.step(`creating ${pc.bold(name)}`)

  const space: SpaceManifest = {
    version: 1,
    name,
    backend: backendName,
    network,
    image: backendName === 'native' ? undefined : image,
    createdAt: new Date().toISOString(),
    stack,
    ephemeral,
  }

  const env = collectEnv(args, cfg.forwardEnv, name)
  // Scaffold the space but leave the environment down; `enter` starts it.
  const noStart = args.bool('no-start')

  // Anything that fails from here on must leave the machine as it found it —
  // a half-created space is worse than no space, because `ls` will show it.
  try {
    const workspace = createSpaceDirs(name)
    const { filesWritten } = scaffold(workspace, stack, {
      name,
      date: new Date().toISOString().slice(0, 10),
    })
    log.ok(`seeded the ${stack} agent stack (${filesWritten} files)`)

    if (noStart) {
      writeControl(space, motd(space))
      writeManifest(space)
      log.ok('space ready — environment not started')
      log.blank()
      log.info(summary(space))
      log.blank()
      log.dim(`start it with: abox enter ${name}`)
      return 0
    }

    await backend.prepare(image, { rebuild: args.bool('rebuild') })

    // The in-space `abox` shim reads these, so they must exist before the
    // environment starts — `--no-attach` spaces never reach runSession.
    const control = writeControl(space, motd(space))

    space.handle = await backend.create({
      name,
      workspace,
      control,
      network,
      image,
      memory: args.string('memory') ?? cfg.memory,
      cpus: args.string('cpus') ?? cfg.cpus,
      env,
    })
  } catch (err) {
    await backend.destroy(space).catch(() => {})
    removeSpaceDir(name)
    throw err
  }

  writeManifest(space)
  log.ok(`environment up`)
  log.blank()
  log.info(summary(space))

  const forwarded = Object.keys(env).filter((k) => !k.startsWith('AGENTSPACE'))
  if (forwarded.length) log.dim(`${pc.bold('env')}       forwarded: ${forwarded.join(', ')}`)

  if (args.bool('no-attach')) {
    log.blank()
    log.dim(`enter it with: abox enter ${name}`)
    return 0
  }

  return runSession(space, backend)
}

/** Host env vars the space is allowed to see — nothing is forwarded by default. */
function collectEnv(args: Args, configured: string[], name: string): Record<string, string> {
  const env: Record<string, string> = {
    AGENTSPACE: '1',
    AGENTSPACE_INSIDE: '1',
    AGENTSPACE_NAME: name,
  }
  const requested = [...configured, ...args.all('env')]
  for (const item of requested) {
    if (item.includes('=')) {
      const idx = item.indexOf('=')
      env[item.slice(0, idx)] = item.slice(idx + 1)
      continue
    }
    const value = process.env[item]
    if (value !== undefined) env[item] = value
  }
  return env
}
