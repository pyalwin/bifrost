import { useState, useEffect } from 'react'

interface GitUser {
  name: string
  initial: string
}

const DEFAULT: GitUser = { name: 'You', initial: 'Y' }
let cachedForProject: string | null = null
let cached: GitUser | null = null

export function useGitUser(projectPath?: string): GitUser {
  const [user, setUser] = useState<GitUser>(cached ?? DEFAULT)

  useEffect(() => {
    // Re-fetch when project changes
    if (cached && cachedForProject === projectPath) return
    if (typeof window.claude?.getGitUser !== 'function') return
    window.claude.getGitUser()
      .then(u => {
        cached = u
        cachedForProject = projectPath ?? null
        setUser(u)
      })
      .catch(() => {})
  }, [projectPath])

  return user
}
