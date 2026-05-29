// MKJ 05/29/26 Centralized error codes and user-friendly messages
// Maps server error reasons to friendly strings for display

export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_INACTIVE: 'account_inactive',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  INVALID_ROLE: 'invalid_role',
  
  // Validation errors
  INVALID_EMAIL: 'invalid_email',
  WEAK_PASSWORD: 'weak_password',
  PASSWORD_MISMATCH: 'password_mismatch',
  MISSING_FIELD: 'missing_field',
  
  // Auth middleware
  AUTHENTICATION_REQUIRED: 'authentication_required',
  FORBIDDEN: 'forbidden',
  
  // Rate limiting
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  
  // Generic
  REQUEST_FAILED: 'request_failed',
  INVALID_REQUEST: 'invalid_request',
  SERVER_ERROR: 'server_error',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// MKJ 05/29/26 User-friendly error messages mapped from error codes
export function getErrorMessage(code: ErrorCode | string): string {
  const messages: Record<string, string> = {
    [ERROR_CODES.INVALID_CREDENTIALS]: 'Incorrect account details. Please check your email and password.',
    [ERROR_CODES.ACCOUNT_LOCKED]: 'Your account has been temporarily locked due to too many failed login attempts. Please try again later.',
    [ERROR_CODES.ACCOUNT_INACTIVE]: 'Your account is disabled. Please contact support.',
    [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists. Try signing in instead.',
    [ERROR_CODES.INVALID_ROLE]: 'The selected role is not available at registration.',
    
    [ERROR_CODES.INVALID_EMAIL]: 'Please enter a valid email address.',
    [ERROR_CODES.WEAK_PASSWORD]: 'Password must be at least 8 characters with uppercase, lowercase, number, and symbol.',
    [ERROR_CODES.PASSWORD_MISMATCH]: 'Passwords do not match.',
    [ERROR_CODES.MISSING_FIELD]: 'Please fill in all required fields.',
    
    [ERROR_CODES.AUTHENTICATION_REQUIRED]: 'You must be signed in to access this.',
    [ERROR_CODES.FORBIDDEN]: 'You do not have permission to access this.',
    [ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many attempts. Please try again later.',
    
    [ERROR_CODES.REQUEST_FAILED]: 'Request failed. Please try again.',
    [ERROR_CODES.INVALID_REQUEST]: 'Invalid request. Please check your input.',
    [ERROR_CODES.SERVER_ERROR]: 'Something went wrong. Please try again later.',
  }
  
  return messages[code] || 'An unexpected error occurred.'
}
