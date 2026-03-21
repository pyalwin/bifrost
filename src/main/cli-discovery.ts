import { execFileSync } from 'child_process'
import { accessSync, constants } from 'fs'

export interface CLIInfo {
  path: string
  version: string
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

function resolveFromCurrentEnv(): string | null {
  try {
    return execFileSync('sh', ['-lc', 'command -v claude'], { encoding: 'utf-8' }).trim() || null
  } catch {
    return null
  }
}

function resolveFromLoginShell(): string | null {
  const shell = process.env.SHELL || '/bin/zsh'
  try {
    return execFileSync(shell, ['-lic', 'command -v claude'], {
      encoding: 'utf-8',
      env: { ...process.env, TERM: 'dumb' },
    }).trim() || null
  } catch {
    return null
  }
}

function resolveFromCommonPaths(): string | null {
  const candidates = [
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    '/usr/bin/claude',
  ]

  return candidates.find(isExecutable) ?? null
}

function resolveClaudePath(): string | null {
  return resolveFromCurrentEnv() ?? resolveFromLoginShell() ?? resolveFromCommonPaths()
}

export function discoverCLI(): CLIInfo {
  const cliPath = resolveClaudePath()
  if (!cliPath) {
    throw new Error(
      'Claude Code CLI not found. Install it from https://claude.ai/claude-code or make sure `claude` is available in your login shell PATH.'
    )
  }

  let version: string
  try {
    version = execFileSync(cliPath, ['--version'], { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error('Failed to get Claude Code CLI version')
  }

  return { path: cliPath, version }
}
