import { execSync } from 'child_process'

export interface CLIInfo {
  path: string
  version: string
}

export function discoverCLI(): CLIInfo {
  let cliPath: string
  try {
    cliPath = execSync('which claude', { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error(
      'Claude Code CLI not found in PATH. Install it from https://claude.ai/claude-code'
    )
  }

  let version: string
  try {
    version = execSync(`"${cliPath}" --version`, { encoding: 'utf-8' }).trim()
  } catch {
    throw new Error('Failed to get Claude Code CLI version')
  }

  return { path: cliPath, version }
}
