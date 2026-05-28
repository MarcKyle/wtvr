// Shared client-side validators. Server-side validation is still mandatory.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Strong password: min 8 chars, mixed case, number, symbol.
export function isStrongPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  )
}
