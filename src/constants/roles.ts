// Mirrors the `roles` table seeded in the MySQL schema.
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
