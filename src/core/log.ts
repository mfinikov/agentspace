import pc from 'picocolors'

const quiet = () => process.env.AGENTSPACE_QUIET === '1'

export const log = {
  info(msg: string) {
    if (!quiet()) console.log(msg)
  },
  step(msg: string) {
    if (!quiet()) console.log(`${pc.cyan('›')} ${msg}`)
  },
  ok(msg: string) {
    if (!quiet()) console.log(`${pc.green('✓')} ${msg}`)
  },
  warn(msg: string) {
    console.warn(`${pc.yellow('!')} ${msg}`)
  },
  error(msg: string) {
    console.error(`${pc.red('✗')} ${msg}`)
  },
  dim(msg: string) {
    if (!quiet()) console.log(pc.dim(msg))
  },
  blank() {
    if (!quiet()) console.log('')
  },
}

export { pc }

/** An error we can print without a stack trace — it's a user-facing problem. */
export class UserError extends Error {
  readonly hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'UserError'
    this.hint = hint
  }
}
