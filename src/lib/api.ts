// MKJ 05/29/26 Minimal fetch wrapper for JSON requests with error code support
// Sends/receives JSON and uses cookie-based sessions by default.
// Configure the Vite dev server to proxy /api -> backend.
const BASE_URL = '/api'

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

// MKJ 05/29/26 Error response structure from server
export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options

  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  })

  if (!response.ok) {
    // MKJ 05/29/26 Try to parse structured error response
    let errorCode = 'request_failed'
    let errorMessage = `Request failed: ${response.status}`
    
    try {
      const json = await response.json()
      if (json.code) errorCode = json.code
      if (json.error) errorMessage = json.error
    } catch {
      // Fall back to text response if JSON parsing fails
      const text = await response.text().catch(() => response.statusText)
      if (text) errorMessage = text
    }
    
    throw new ApiError(errorCode, errorMessage, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
