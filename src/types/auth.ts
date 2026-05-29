import type { Role } from '../constants/roles'
import type { User } from './user'

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = LoginPayload & {
  // Persona chosen at sign-up. The server is the source of truth and may
  // reject or remap this value; we send it for UX continuity only.
  role: Role
}

export type AuthResponse = {
  user: User
  token?: string
}
