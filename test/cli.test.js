import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cli = path.join(root, 'dist', 'cli.js')

let HOME

/** Run the CLI against an isolated state directory. */
function abox(args, opts = {}) {
  try {
    const stdout = execFileSync(process.execPath, [cli, ...args], {
      encoding: 'utf8',
      env: { ...process.env, AGENTSPACE_HOME: HOME, NO_COLOR: '1', ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, stdout }
  } catch (err) {
    if (opts.allowFailure) return { code: err.status ?? 1, stdout: `${err.stdout ?? ''}${err.stderr ?? ''}` }
    throw new Error(`abox ${args.join(' ')} failed:\n${err.stdout}\n${err.stderr}`)
  }
}

const spaceRoot = (name) => path.join(HOME, 'spaces', name)
const workspace = (name) => path.join(spaceRoot(name), 'workspace')

before(() => {
  assert.ok(fs.existsSync(cli), 'run `npm run build` before the tests')
  HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'agentspace-test-'))
})

after(() => {
  fs.rmSync(HOME, { recursive: true, force: true })
})

test('help and version do not need any state', () => {
  assert.match(abox(['help']).stdout, /agentspace/)
  assert.match(abox(['--version']).stdout, /^\d+\.\d+\.\d+/)
})

test('an unknown command fails with a usable message', () => {
  const { code, stdout } = abox(['nope'], { allowFailure: true })
  assert.equal(code, 1)
  assert.match(stdout, /unknown command/)
})

test('ls is empty before anything exists', () => {
  assert.match(abox(['ls']).stdout, /no spaces yet/)
})

test('new seeds the full agent stack', () => {
  abox(['new', 'unit', '--backend', 'native', '--no-attach'])
  const ws = workspace('unit')

  for (const file of [
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'scripts/check.sh',
    'scripts/bootstrap.sh',
    'notes/journal.md',
    'docs/decisions/0000-template.md',
    '.agents/README.md',
  ]) {
    assert.ok(fs.existsSync(path.join(ws, file)), `missing ${file}`)
  }

  const skills = fs.readdirSync(path.join(ws, '.agents/skills'))
  assert.ok(skills.length >= 9, `expected the skill set, got ${skills.join(',')}`)
  for (const skill of skills) {
    const body = fs.readFileSync(path.join(ws, '.agents/skills', skill, 'SKILL.md'), 'utf8')
    assert.match(body, /^---\nname: /, `${skill} is missing frontmatter`)
    assert.match(body, /\ndescription: /, `${skill} is missing a description`)
  }

  const subagents = fs.readdirSync(path.join(ws, '.agents/subagents'))
  assert.deepEqual(subagents.sort(), [
    'architect.md', 'implementer.md', 'qa.md', 'researcher.md', 'reviewer.md',
  ])

  assert.equal(fs.readFileSync(path.join(ws, 'CLAUDE.md'), 'utf8').trim(), '@AGENTS.md')
})

test('.claude points at .agents so both toolchains read one definition', () => {
  const claude = path.join(workspace('unit'), '.claude')
  assert.equal(fs.readlinkSync(path.join(claude, 'skills')), '../.agents/skills')
  assert.equal(fs.readlinkSync(path.join(claude, 'agents')), '../.agents/subagents')
  assert.ok(fs.existsSync(path.join(claude, 'skills', 'plan', 'SKILL.md')))
})

test('scripts are executable inside the space', () => {
  for (const script of ['check.sh', 'bootstrap.sh']) {
    const mode = fs.statSync(path.join(workspace('unit'), 'scripts', script)).mode
    assert.ok(mode & 0o111, `${script} is not executable`)
  }
})

test('the manifest records the isolation settings', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(spaceRoot('unit'), 'space.json'), 'utf8'))
  assert.equal(manifest.name, 'unit')
  assert.equal(manifest.backend, 'native')
  assert.equal(manifest.ephemeral, true)
  assert.equal(manifest.stack, 'default')
})

test('ls and status report the new space', () => {
  assert.match(abox(['ls']).stdout, /unit\s+.*native/)
  const json = JSON.parse(abox(['ls', '--json']).stdout)
  assert.equal(json.length, 1)
  assert.match(abox(['status', 'unit']).stdout, /ephemeral/)
})

test('a duplicate name is refused rather than clobbering the workspace', () => {
  const { code, stdout } = abox(['new', 'unit', '--no-attach'], { allowFailure: true })
  assert.equal(code, 1)
  assert.match(stdout, /already exists/)
  assert.ok(fs.existsSync(path.join(workspace('unit'), 'AGENTS.md')))
})

test('--net rejects a value that is not a policy', () => {
  const { code, stdout } = abox(['new', 'bad', '--net', 'sometimes', '--no-attach'], {
    allowFailure: true,
  })
  assert.equal(code, 1)
  assert.match(stdout, /--net must be/)
})

test('--keep marks the space persistent', () => {
  abox(['new', 'kept', '--backend', 'native', '--keep', '--no-attach'])
  const manifest = JSON.parse(fs.readFileSync(path.join(spaceRoot('kept'), 'space.json'), 'utf8'))
  assert.equal(manifest.ephemeral, false)
  assert.match(abox(['leave', 'kept']).stdout, /files kept/)
  assert.ok(fs.existsSync(workspace('kept')), 'a kept space must survive leave')
})

test('config round-trips through disk', () => {
  abox(['config', 'set', 'network', 'none'])
  assert.equal(abox(['config', 'get', 'network']).stdout.trim(), 'none')
  const { code, stdout } = abox(['config', 'set', 'network', 'maybe'], { allowFailure: true })
  assert.equal(code, 1)
  assert.match(stdout, /network must be/)
  abox(['config', 'reset'])
  assert.equal(abox(['config', 'get', 'network']).stdout.trim(), 'full')
})

test('rm deletes the workspace and everything in it', () => {
  fs.writeFileSync(path.join(workspace('unit'), 'secret.txt'), 'do not survive')
  abox(['rm', 'unit', '--force'])
  assert.equal(fs.existsSync(spaceRoot('unit')), false)
  assert.match(abox(['status', 'unit'], { allowFailure: true }).stdout, /not found/)
})

test('prune destroys ephemeral spaces and spares kept ones', () => {
  abox(['new', 'temp-a', '--backend', 'native', '--no-attach'])
  abox(['new', 'temp-b', '--backend', 'native', '--no-attach'])
  abox(['prune', '--force'])
  assert.equal(fs.existsSync(spaceRoot('temp-a')), false)
  assert.equal(fs.existsSync(spaceRoot('temp-b')), false)
  assert.ok(fs.existsSync(spaceRoot('kept')), 'prune must not touch a kept space')
})

test('backend selection rejects a runtime that does not exist', () => {
  const { code, stdout } = abox(['config', 'set', 'backend', 'xen'], { allowFailure: true })
  assert.equal(code, 1)
  assert.match(stdout, /backend must be one of: auto, apple, docker, native/)
})

test('an explicitly requested backend is never silently swapped', () => {
  // Docker is not running in CI on macOS, so asking for it must fail loudly
  // rather than quietly producing a weaker native space.
  const { code, stdout } = abox(['new', 'pinned', '--backend', 'docker', '--no-attach'], {
    allowFailure: true,
  })
  if (code !== 0) {
    assert.match(stdout, /cannot run here/)
    assert.equal(fs.existsSync(spaceRoot('pinned')), false, 'a failed create must leave nothing')
  } else {
    const manifest = JSON.parse(fs.readFileSync(path.join(spaceRoot('pinned'), 'space.json'), 'utf8'))
    assert.equal(manifest.backend, 'docker')
    abox(['rm', 'pinned', '--force'])
  }
})

test('the minimal stack links only what it ships', () => {
  abox(['new', 'small', '--backend', 'native', '--stack', 'minimal', '--no-attach'])
  const claude = path.join(workspace('small'), '.claude')
  assert.ok(fs.existsSync(path.join(claude, 'skills')))
  for (const missing of ['agents', 'commands']) {
    assert.equal(
      fs.existsSync(path.join(claude, missing)) || !!fs.lstatSync(path.join(claude, missing), { throwIfNoEntry: false }),
      false,
      `.claude/${missing} must not be a dangling link`,
    )
  }
  assert.ok(fs.existsSync(path.join(workspace('small'), 'AGENTS.md')))
  abox(['rm', 'small', '--force'])
})

test('an unknown stack is refused before anything is created', () => {
  const { code, stdout } = abox(['new', 'nostack', '--stack', 'nope', '--no-attach'], {
    allowFailure: true,
  })
  assert.equal(code, 1)
  assert.match(stdout, /unknown stack/)
  assert.equal(fs.existsSync(spaceRoot('nostack')), false)
})

test('a one-character name is valid', () => {
  abox(['new', 'x', '--backend', 'native', '--no-attach'])
  assert.ok(fs.existsSync(path.join(workspace('x'), 'AGENTS.md')))
  abox(['rm', 'x', '--force'])
})

test('stop keeps the files and is safe to repeat', () => {
  abox(['new', 'halted', '--backend', 'native', '--keep', '--no-attach'])
  fs.writeFileSync(path.join(workspace('halted'), 'survives.txt'), 'still here')
  abox(['stop', 'halted'])
  abox(['stop', 'halted'])
  assert.equal(
    fs.readFileSync(path.join(workspace('halted'), 'survives.txt'), 'utf8'),
    'still here',
  )
  abox(['rm', 'halted', '--force'])
})

test('down succeeds when there is nothing running', () => {
  const { code } = abox(['down'], { allowFailure: true })
  assert.equal(code, 0)
})

test('the default memory ceiling is sized for a laptop', () => {
  // A container VM commits only what the guest touches, but the ceiling is
  // what a runaway process can reach — 4g per space was too much on 16GB.
  assert.equal(abox(['config', 'get', 'memory']).stdout.trim(), '2g')
})

test('doctor exits zero when a backend is available', () => {
  const { code, stdout } = abox(['doctor'], { allowFailure: true })
  assert.match(stdout, /backends/)
  assert.equal(code, 0)
})
