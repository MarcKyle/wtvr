// MKJ 05/29/26 Centralized error codes (shared concept with client)
// Server uses these to structure error responses

export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_INACTIVE: 'account_inactive',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  INVALID_ROLE: 'invalid_role',
  
  // Validation errors
  INVALID_REQUEST: 'invalid_request',
  
  // Auth middleware
  AUTHENTICATION_REQUIRED: 'authentication_required',
  FORBIDDEN: 'forbidden',
  
  // Rate limiting
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  
  // Generic
  SERVER_ERROR: 'server_error',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
