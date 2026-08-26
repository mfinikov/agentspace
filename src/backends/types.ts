import type { SpaceManifest } from '../core/state.js'

export interface CreateOptions {
  name: string
  workspace: string
  /** Host dir bind-mounted at /run/agentspace for out-of-band control files. */
  control: string
  network: 'none' | 'full'
  image: string
  memory: string
  cpus: string
  env: Record<string, string>
}

export interface Backend {
  readonly name: 'apple' | 'docker' | 'native'
  /** Human-readable reason this backend can't run here, or null if it can. */
  unavailableReason(): string | null
  /** Build/prepare any prerequisites (e.g. the base image). */
  prepare(image: string, opts?: { rebuild?: boolean }): Promise<void>
  /** Start an isolated environment; returns the handle stored in the manifest. */
  create(opts: CreateOptions): Promise<string>
  /** Attach an interactive shell. Resolves with the shell's exit code. */
  attach(space: SpaceManifest, opts: { workspace: string; control: string }): Promise<number>
  /** Run a single command inside the space, streaming output. */
  exec(space: SpaceManifest, argv: string[], opts: { workspace: string; control: string }): Promise<number>
  /** Is the environment currently running? */
  isRunning(space: SpaceManifest): boolean
  /**
   * Halt the environment without destroying it, releasing its memory.
   * `aspace enter` brings it back. Idempotent.
   */
  stop(space: SpaceManifest): Promise<void>
  /** Stop and delete the environment (idempotent). */
  destroy(space: SpaceManifest): Promise<void>
}
