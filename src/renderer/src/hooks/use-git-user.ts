import { useState, useEffect } from 'react'

interface GitUser {
  name: string
  initial: string
}

const DEFAULT: GitUser = { name: 'You', initial: 'Y' }
let cached: GitUser | null = null

export function useGitUser(): GitUser {
  const [user, setUser] = useState<GitUser>(cached ?? DEFAULT)

  useEffect(() => {
    if (cached) return
    window.claude?.getGitUser()
      .then(u => {
        cached = u
        setUser(u)
      })
      .catch(() => {})
  }, [])

  return user
}
