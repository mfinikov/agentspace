import crypto from 'node:crypto'

const ADJECTIVES = [
  'amber', 'brisk', 'calm', 'dusky', 'eager', 'fleet', 'glad', 'hazel',
  'ionic', 'jade', 'keen', 'lucid', 'mellow', 'nimble', 'opal', 'plush',
  'quiet', 'rapid', 'solar', 'terse', 'umber', 'vivid', 'warm', 'zesty',
]

const NOUNS = [
  'anvil', 'basin', 'cedar', 'delta', 'ember', 'fjord', 'grove', 'harbor',
  'inlet', 'jetty', 'kiln', 'lagoon', 'mesa', 'nook', 'orbit', 'prairie',
  'quarry', 'ridge', 'summit', 'tundra', 'vault', 'willow', 'yard', 'zenith',
]

function pick<T>(list: readonly T[]): T {
  const i = crypto.randomInt(0, list.length)
  return list[i] as T
}

/** Human-friendly, collision-resistant space name, e.g. `lucid-harbor-4f2a`. */
export function generateName(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${crypto.randomBytes(2).toString('hex')}`
}

const SLUG_OK = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

export function assertValidName(name: string): void {
  if (!SLUG_OK.test(name)) {
    throw new Error(
      `invalid space name "${name}" — use 2-40 lowercase letters, digits and dashes`,
    )
  }
}
