// Centralized route paths to avoid magic strings.
// Login is the entry point of the app; signed-in users are redirected from
// `/` to a role-specific home (reader, author, or admin).
export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  READER_HOME: '/reader',
  AUTHOR_HOME: '/author',
  ADMIN: '/admin',
  PROFILE: '/profile',
} as const
