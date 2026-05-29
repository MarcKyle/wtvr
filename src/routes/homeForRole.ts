import { ROLES, type Role } from '../constants/roles'
import { ROUTES } from '../constants/routes'

// Returns the dedicated home route for a given role. Used both when
// redirecting after login/register and when resolving the root path.
export function homeForRole(role: Role): string {
  switch (role) {
    case ROLES.ADMIN:
      return ROUTES.ADMIN
    case ROLES.AUTHOR:
      return ROUTES.AUTHOR_HOME
    case ROLES.READER:
    default:
      return ROUTES.READER_HOME
  }
}
