import pc from 'picocolors'
import { getBackend } from '../backends/index.js'
import { log } from '../core/log.js'
import { dirSize, formatBytes, getCurrent, listSpaces } from '../core/state.js'
import { workspaceDir } from '../core/paths.js'
import type { Args } from '../cli-args.js'

function age(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function stateLabel(space: { backend: Parameters<typeof getBackend>[0] }): string {
  const backend = getBackend(space.backend)
  // The native sandbox has nothing to be up or down; it is simply available.
  if (!backend.persistent) return pc.dim('ready')
  return backend.isRunning(space as never) ? pc.green('up') : pc.dim('down')
}

// Colour codes must not count toward column width.
const ANSI = /\x1b\[[0-9;]*m/g
const visibleWidth = (s: string) => s.replace(ANSI, '').length

export async function cmdLs(args: Args): Promise<number> {
  const spaces = listSpaces()

  if (args.bool('json')) {
    console.log(JSON.stringify(spaces, null, 2))
    return 0
  }

  if (!spaces.length) {
    log.info('no spaces yet')
    log.dim('  create one: apen new')
    return 0
  }

  const current = getCurrent()
  const rows = spaces.map((s) => ({
    name: s.name + (s.name === current ? pc.cyan(' *') : ''),
    state: stateLabel(s),
    backend: s.backend,
    net: s.network,
    life: s.ephemeral ? 'ephemeral' : pc.yellow('kept'),
    size: formatBytes(dirSize(workspaceDir(s.name))),
    created: age(s.createdAt),
  }))

  const headers = ['SPACE', 'STATE', 'BACKEND', 'NET', 'LIFETIME', 'SIZE', 'CREATED']
  const keys = ['name', 'state', 'backend', 'net', 'life', 'size', 'created'] as const
  const widths = keys.map((k, i) =>
    Math.max(headers[i]!.length, ...rows.map((r) => visibleWidth(r[k]))),
  )
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - visibleWidth(s)))

  log.info(pc.dim(headers.map((h, i) => pad(h, widths[i]!)).join('  ')))
  for (const row of rows) {
    log.info(keys.map((k, i) => pad(row[k], widths[i]!)).join('  '))
  }
  if (current) {
    log.blank()
    log.dim('* current — `apen leave` acts on this one')
  }
  return 0
}
