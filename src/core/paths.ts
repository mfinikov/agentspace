import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Root of all agentspace state on the host. Override with AGENTSPACE_HOME. */
export function home(): string {
  const override = process.env.AGENTSPACE_HOME
  if (override && override.trim()) return path.resolve(override)
  return path.join(os.homedir(), '.agentspace')
}

export const spacesDir = () => path.join(home(), 'spaces')
export const spaceDir = (id: string) => path.join(spacesDir(), id)
export const workspaceDir = (id: string) => path.join(spaceDir(id), 'workspace')
export const manifestPath = (id: string) => path.join(spaceDir(id), 'space.json')
export const configPath = () => path.join(home(), 'config.json')
export const currentPath = () => path.join(home(), 'current')

/**
 * Locate the package root so we can read `templates/` and `docker/` whether we
 * run from `dist/cli.js`, from a global npm install, or straight from source.
 */
export function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'templates'))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  // Fall back to two levels up from this file (dist/ -> package root).
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

export const templatesDir = () => path.join(packageRoot(), 'templates')
export const dockerDir = () => path.join(packageRoot(), 'docker')

export function ensureHome(): void {
  fs.mkdirSync(spacesDir(), { recursive: true })
}
