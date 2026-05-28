import type { User } from './user'

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = LoginPayload

export type AuthResponse = {
  user: User
  token?: string
}
