import { api } from '../lib/api'
import type { User } from '../types/user'
import type { Role } from '../constants/roles'

// Admin-only user management endpoints.
export const userService = {
  list: () => api.get<User[]>('/users'),
  get: (id: number) => api.get<User>(`/users/${id}`),
  updateRole: (id: number, role: Role) =>
    api.patch<User>(`/users/${id}/role`, { role }),
  setActive: (id: number, isActive: boolean) =>
    api.patch<User>(`/users/${id}/active`, { isActive }),
}
