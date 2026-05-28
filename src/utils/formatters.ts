// Date and string helpers used across pages.
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString()
}
