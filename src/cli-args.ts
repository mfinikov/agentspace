/**
 * Tiny argv parser. Supports `--flag`, `--no-flag`, `--key value`, `--key=value`
 * and repeated keys; everything after `--` is passed through untouched.
 */
export class Args {
  readonly positional: string[] = []
  readonly passthrough: string[] = []
  private readonly flags = new Map<string, string[]>()

  constructor(argv: string[]) {
    let i = 0
    for (; i < argv.length; i++) {
      const token = argv[i] as string
      if (token === '--') {
        this.passthrough.push(...argv.slice(i + 1))
        break
      }
      if (token.startsWith('--')) {
        const body = token.slice(2)
        const eq = body.indexOf('=')
        if (eq !== -1) {
          this.push(body.slice(0, eq), body.slice(eq + 1))
          continue
        }
        const next = argv[i + 1]
        if (next !== undefined && !next.startsWith('-')) {
          this.push(body, next)
          i++
        } else {
          this.push(body, 'true')
        }
        continue
      }
      if (token.startsWith('-') && token.length > 1) {
        for (const ch of token.slice(1)) this.push(ch, 'true')
        continue
      }
      this.positional.push(token)
    }
  }

  private push(key: string, value: string): void {
    const list = this.flags.get(key)
    if (list) list.push(value)
    else this.flags.set(key, [value])
  }

  has(key: string): boolean {
    return this.flags.has(key)
  }

  /** `--flag` / `--flag=true` are true; `--no-flag` sets it false. */
  bool(key: string): boolean {
    if (this.flags.has(`no-${key}`)) return false
    const value = this.flags.get(key)?.at(-1)
    if (value === undefined) return false
    return value !== 'false' && value !== '0'
  }

  string(key: string): string | undefined {
    const value = this.flags.get(key)?.at(-1)
    return value === 'true' ? undefined : value
  }

  all(key: string): string[] {
    return (this.flags.get(key) ?? []).filter((v) => v !== 'true')
  }
}
