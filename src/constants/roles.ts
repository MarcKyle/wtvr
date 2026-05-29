// Frontend role identifiers. Mirrors the `roles` table seeded in MySQL.
// `author` and `admin` correspond to the `user` and `admin` server roles in
// PROJECT_DESCRIPTION.md; `reader` is a registration-time persona used to
// route signed-in users to a read-only experience.
export const ROLES = {
  ADMIN: 'admin',
  AUTHOR: 'author',
  READER: 'reader',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const REGISTRATION_ROLES: Role[] = [ROLES.READER, ROLES.AUTHOR]
