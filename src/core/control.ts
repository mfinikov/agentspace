import fs from 'node:fs'
import path from 'node:path'
import type { SpaceManifest } from './state.js'
import { spaceDir } from './paths.js'

export const controlDir = (name: string) => path.join(spaceDir(name), 'control')

/** Files the in-space `aspace` shim reads and writes, outside the workspace. */
export function writeControl(space: SpaceManifest, motd: string): string {
  const dir = controlDir(space.name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'name'), `${space.name}\n`)
  fs.writeFileSync(path.join(dir, 'network'), `${space.network}\n`)
  fs.writeFileSync(path.join(dir, 'backend'), `${space.backend}\n`)
  fs.writeFileSync(path.join(dir, 'motd'), motd)
  clearLeaveRequest(space.name)
  return dir
}

export type LeaveRequest = 'destroy' | 'keep' | null

/** What the user asked for with `aspace leave` from inside the space. */
export function readLeaveRequest(name: string): LeaveRequest {
  try {
    const raw = fs.readFileSync(path.join(controlDir(name), 'leave'), 'utf8').trim()
    return raw === 'keep' ? 'keep' : 'destroy'
  } catch {
    return null
  }
}

export function clearLeaveRequest(name: string): void {
  fs.rmSync(path.join(controlDir(name), 'leave'), { force: true })
}
