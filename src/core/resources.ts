import { run } from './proc.js'

export interface VmUsage {
  /** Number of guest VMs currently resident. */
  count: number
  /** Combined physical footprint in MB, as Activity Monitor reports it. */
  megabytes: number
}

/**
 * What the container runtime is costing right now.
 *
 * `ps` RSS badly undercounts a VM — the guest's memory is mapped in a way it
 * does not attribute — so read `phys_footprint`, which is the number Activity
 * Monitor shows.
 */
export function virtualMachineUsage(): VmUsage | null {
  if (process.platform !== 'darwin') return null
  const pids = run('pgrep', ['-f', 'com.apple.Virtualization.VirtualMachine'])
  if (pids.code !== 0) return { count: 0, megabytes: 0 }

  const list = pids.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
  let megabytes = 0
  for (const pid of list) {
    const out = run('footprint', ['-p', pid])
    if (out.code !== 0) continue
    const line = out.stdout.split('\n').filter((l) => /phys_footprint/i.test(l)).pop()
    const match = line && /([\d.]+)\s*(MB|GB|KB)/i.exec(line)
    if (!match) continue
    const value = Number(match[1])
    const unit = match[2]!.toUpperCase()
    megabytes += unit === 'GB' ? value * 1024 : unit === 'KB' ? value / 1024 : value
  }
  return { count: list.length, megabytes: Math.round(megabytes) }
}

export function formatMegabytes(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`
}
