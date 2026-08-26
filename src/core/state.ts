import fs from 'node:fs'
import path from 'node:path'
import type { BackendName, NetworkMode } from './config.js'
import {
  currentPath,
  ensureHome,
  manifestPath,
  spaceDir,
  spacesDir,
  workspaceDir,
} from './paths.js'

export interface SpaceManifest {
  /** Schema version so future CLI releases can migrate old spaces. */
  version: 1
  name: string
  backend: BackendName
  network: NetworkMode
  image?: string
  /** Container id / pid handle owned by the backend. */
  handle?: string
  createdAt: string
  /** ISO timestamp of the last `apen enter`/`new` attach. */
  lastEnteredAt?: string
  /** Template pack that seeded the workspace. */
  stack: string
  /** When false, `apen leave` keeps the workspace on disk. */
  ephemeral: boolean
}

export function listSpaces(): SpaceManifest[] {
  let entries: string[]
  try {
    entries = fs.readdirSync(spacesDir())
  } catch {
    return []
  }
  const out: SpaceManifest[] = []
  for (const name of entries) {
    const m = readManifest(name)
    if (m) out.push(m)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function readManifest(name: string): SpaceManifest | null {
  try {
    const raw = fs.readFileSync(manifestPath(name), 'utf8')
    return JSON.parse(raw) as SpaceManifest
  } catch {
    return null
  }
}

export function writeManifest(m: SpaceManifest): void {
  fs.mkdirSync(spaceDir(m.name), { recursive: true })
  fs.writeFileSync(manifestPath(m.name), `${JSON.stringify(m, null, 2)}\n`)
}

export function updateManifest(name: string, patch: Partial<SpaceManifest>): SpaceManifest {
  const current = readManifest(name)
  if (!current) throw new Error(`space "${name}" not found`)
  const next = { ...current, ...patch }
  writeManifest(next)
  return next
}

export function spaceExists(name: string): boolean {
  return fs.existsSync(manifestPath(name))
}

export function createSpaceDirs(name: string): string {
  const ws = workspaceDir(name)
  fs.mkdirSync(ws, { recursive: true })
  return ws
}

/** Delete every trace of a space from the host. */
export function removeSpaceDir(name: string): void {
  fs.rmSync(spaceDir(name), { recursive: true, force: true })
}

/** The space the user most recently attached to — used by bare `apen leave`. */
export function setCurrent(name: string | null): void {
  ensureHome()
  if (name === null) {
    fs.rmSync(currentPath(), { force: true })
    return
  }
  fs.writeFileSync(currentPath(), `${name}\n`)
}

export function getCurrent(): string | null {
  try {
    const name = fs.readFileSync(currentPath(), 'utf8').trim()
    return name && spaceExists(name) ? name : null
  } catch {
    return null
  }
}

/** Recursive size in bytes — shown before a destructive leave. */
export function dirSize(dir: string): number {
  let total = 0
  const walk = (d: string) => {
    let items: fs.Dirent[]
    try {
      items = fs.readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const item of items) {
      const full = path.join(d, item.name)
      if (item.isDirectory()) walk(full)
      else if (item.isFile()) {
        try {
          total += fs.statSync(full).size
        } catch {
          // Raced with deletion; ignore.
        }
      }
    }
  }
  walk(dir)
  return total
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)}${units[i]}`
}
