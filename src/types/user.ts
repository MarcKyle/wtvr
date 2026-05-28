import type { Role } from '../constants/roles'

export type User = {
  id: number
  email: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}
