import fs from 'node:fs'
import path from 'node:path'
import { templatesDir } from './paths.js'
import { UserError } from './log.js'

export function availableStacks(): string[] {
  try {
    return fs
      .readdirSync(path.join(templatesDir(), 'stack'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  } catch {
    return []
  }
}

export function stackDir(stack: string): string {
  const dir = path.join(templatesDir(), 'stack', stack)
  if (!fs.existsSync(dir)) {
    throw new UserError(
      `unknown stack "${stack}"`,
      `available: ${availableStacks().join(', ') || '(none found)'}`,
    )
  }
  return dir
}

/** Copy a template tree without clobbering anything the user already has. */
function copyTree(from: string, to: string): number {
  let written = 0
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)
    if (entry.isDirectory()) {
      written += copyTree(src, dest)
    } else if (entry.isFile()) {
      if (fs.existsSync(dest)) continue
      fs.copyFileSync(src, dest)
      fs.chmodSync(dest, fs.statSync(src).mode)
      written++
    }
  }
  return written
}

/**
 * Point `.claude/{skills,agents,commands}` at `.agents/` so Claude Code and
 * any AGENTS.md-native tool read one set of definitions instead of two.
 */
function linkClaudeDir(workspace: string): void {
  const claude = path.join(workspace, '.claude')
  fs.mkdirSync(claude, { recursive: true })
  const links: [string, string][] = [
    ['skills', '../.agents/skills'],
    ['agents', '../.agents/subagents'],
    ['commands', '../.agents/commands'],
  ]
  for (const [name, target] of links) {
    const link = path.join(claude, name)
    if (fs.existsSync(link) || fs.lstatSync(link, { throwIfNoEntry: false })) continue
    // A stack need not ship every category; a link to nothing is worse than
    // no link, because tools report it as a broken path.
    if (!fs.existsSync(path.resolve(claude, target))) continue
    try {
      fs.symlinkSync(target, link, 'dir')
    } catch {
      // Windows without developer mode, or a filesystem without symlinks:
      // fall back to a copy so the definitions are still discoverable.
      copyTree(path.resolve(claude, target), link)
    }
  }
}

export interface ScaffoldResult {
  filesWritten: number
  stack: string
}

export function scaffold(workspace: string, stack: string, vars: Record<string, string>): ScaffoldResult {
  const from = stackDir(stack)
  const filesWritten = copyTree(from, workspace)
  linkClaudeDir(workspace)

  // Stamp the space's own identity into the journal's placeholder date.
  const journal = path.join(workspace, 'notes', 'journal.md')
  try {
    const text = fs.readFileSync(journal, 'utf8')
    const stamped = text
      .replace('<YYYY-MM-DD>', vars.date ?? '')
      .replace('space created', `space \`${vars.name ?? 'unnamed'}\` created`)
    if (stamped !== text) fs.writeFileSync(journal, stamped)
  } catch {
    // A stack without a journal is fine.
  }

  return { filesWritten, stack }
}
