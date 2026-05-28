import { api } from '../lib/api'
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth'
import type { User } from '../types/user'

// Auth endpoints. Matches a Node/Express backend exposing /api/auth/*.
export const authService = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', payload),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
}
