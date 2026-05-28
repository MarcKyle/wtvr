import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

// Convenience hook for consuming AuthContext. Throws if used outside provider.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
