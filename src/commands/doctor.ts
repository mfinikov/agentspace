import fs from 'node:fs'
import pc from 'picocolors'
import { allBackends } from '../backends/index.js'
import { loadConfig } from '../core/config.js'
import { log } from '../core/log.js'
import { home, templatesDir } from '../core/paths.js'
import { availableStacks } from '../core/scaffold.js'
import { listSpaces } from '../core/state.js'
import type { Args } from '../cli-args.js'

export async function cmdDoctor(_args: Args): Promise<number> {
  const cfg = loadConfig()
  let problems = 0

  log.blank()
  log.info(pc.bold('agentspace doctor'))
  log.blank()

  log.info(pc.bold('backends'))
  let anyBackend = false
  for (const backend of allBackends()) {
    const reason = backend.unavailableReason()
    if (reason) {
      log.info(`  ${pc.yellow('unavailable')}  ${backend.name} — ${reason}`)
    } else {
      anyBackend = true
      log.info(`  ${pc.green('ready')}        ${backend.name}`)
    }
  }
  if (!anyBackend) {
    problems++
    log.blank()
    log.error('no isolation backend is available — agentspace cannot create a space')
    log.dim('  install Docker Desktop, or run on macOS where sandbox-exec exists')
  } else if (allBackends()[0]!.unavailableReason()) {
    log.blank()
    log.warn('docker is unavailable, so spaces will use the weaker native sandbox')
    log.dim('  native confines writes to the workspace but shares the host kernel and PATH')
  }

  log.blank()
  log.info(pc.bold('templates'))
  const stacks = availableStacks()
  if (!stacks.length) {
    problems++
    log.info(`  ${pc.red('missing')}      no stacks found in ${templatesDir()}`)
  } else {
    log.info(`  ${pc.green('ok')}           ${stacks.length} stack(s): ${stacks.join(', ')}`)
  }

  log.blank()
  log.info(pc.bold('state'))
  log.info(`  home         ${home()}`)
  log.info(`  writable     ${writable(home()) ? pc.green('yes') : pc.red('no')}`)
  if (!writable(home())) problems++
  const spaces = listSpaces()
  log.info(`  spaces       ${spaces.length}`)

  log.blank()
  log.info(pc.bold('config'))
  for (const [key, value] of Object.entries(cfg)) {
    log.info(`  ${key.padEnd(15)}${Array.isArray(value) ? value.join(', ') || '(none)' : String(value)}`)
  }

  log.blank()
  if (problems === 0) {
    log.ok('everything checks out — `aspace new` will work')
  } else {
    log.error(`${problems} problem(s) found`)
  }
  return problems === 0 ? 0 : 1
}

function writable(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}
