import readline from 'node:readline/promises'

/** Yes/no question. Returns `fallback` when there is no TTY to ask on. */
export async function confirm(question: string, fallback: boolean): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return fallback
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const suffix = fallback ? '[Y/n]' : '[y/N]'
    const answer = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase()
    if (!answer) return fallback
    return answer === 'y' || answer === 'yes'
  } finally {
    rl.close()
  }
}
