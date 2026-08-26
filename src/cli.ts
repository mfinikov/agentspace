import pc from 'picocolors'
import { Args } from './cli-args.js'
import { UserError, log } from './core/log.js'
import { ensureHome } from './core/paths.js'
import { cmdNew } from './commands/new.js'
import { cmdLeave, cmdPrune, cmdRm } from './commands/leave.js'
import { cmdLs } from './commands/ls.js'
import { cmdEnter, cmdExec } from './commands/enter.js'
import { cmdStatus } from './commands/status.js'
import { cmdDoctor } from './commands/doctor.js'
import { cmdConfig } from './commands/config.js'
import { cmdDown, cmdStop } from './commands/stop.js'

const VERSION = '0.1.0'

type Handler = (args: Args) => Promise<number>

const COMMANDS: Record<string, Handler> = {
  new: cmdNew,
  leave: cmdLeave,
  enter: cmdEnter,
  exec: cmdExec,
  ls: cmdLs,
  list: cmdLs,
  status: cmdStatus,
  stop: cmdStop,
  down: cmdDown,
  rm: cmdRm,
  prune: cmdPrune,
  doctor: cmdDoctor,
  config: cmdConfig,
}

function help(): void {
  const b = pc.bold
  const d = pc.dim
  console.log(`
${b('agentsandbox')} ${d(`v${VERSION}`)} — a disposable machine for your agents

  One folder goes in. Nothing comes out. Everything is gone when you leave.

${b('USAGE')}
  abox <command> [options]

${b('COMMANDS')}
  ${b('new')} [name]           create a space and drop into it
  ${b('leave')} [name]         destroy the current space and return to your machine
  ${b('enter')} [name]         re-enter a space you kept
  ${b('exec')} -- <cmd>        run one command inside a space
  ${b('ls')}                   list spaces
  ${b('status')} [name]        show a space's isolation settings and size
  ${b('stop')} [name]          halt a space, keep its files, release its memory
  ${b('down')}                 stop every space and the build VM
  ${b('rm')} <name...>         destroy specific spaces
  ${b('prune')}                destroy every ephemeral space
  ${b('doctor')}               check that this machine can run spaces
  ${b('config')}               view or change defaults

${b('NEW OPTIONS')}
  --net none|full        network policy ${d('(default: full — internet, never the host)')}
  --backend docker|native|auto
  --stack <name>         which agent stack to seed ${d('(default: default)')}
  --keep                 persistent space: 'leave' detaches instead of deleting
  --env KEY[=VALUE]      forward one host env var in ${d('(repeatable)')}
  --memory 4g --cpus 2   resource limits
  --no-attach            create it but stay on the host
  --rebuild              rebuild the base image first

${b('INSIDE A SPACE')}
  abox leave           destroy it and return
  abox leave --keep    detach, keep it for \`abox enter\`
  abox status          what is isolated and what is shared

${b('WHAT IS ISOLATED')}
  ${pc.green('shared')}    /workspace  ${d('<->')}  ~/.agentspace/spaces/<name>/workspace
  ${pc.red('blocked')}   your home directory, your keys, your other projects,
            anything listening on your machine's localhost

${d('  https://github.com/mfinikov/agentsandbox')}
`)
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const first = argv[0]

  if (!first || first === 'help' || first === '--help' || first === '-h') {
    help()
    return 0
  }
  if (first === '--version' || first === '-v' || first === 'version') {
    console.log(VERSION)
    return 0
  }

  const handler = COMMANDS[first]
  if (!handler) {
    log.error(`unknown command "${first}"`)
    log.dim(`  known commands: ${Object.keys(COMMANDS).join(', ')}`)
    log.dim('  run `abox help` for usage')
    return 1
  }

  ensureHome()
  return handler(new Args(argv.slice(1)))
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((err: unknown) => {
    if (err instanceof UserError) {
      log.error(err.message)
      if (err.hint) log.dim(`  ${err.hint}`)
    } else if (err instanceof Error) {
      log.error(err.message)
      if (process.env.AGENTSPACE_DEBUG) console.error(err.stack)
      else log.dim('  run again with AGENTSPACE_DEBUG=1 for the stack trace')
    } else {
      log.error(String(err))
    }
    process.exitCode = 1
  })
