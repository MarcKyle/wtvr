// MKJ 05/29/26 Custom hook for handling API errors with user-friendly messages
import { useCallback } from 'react'
import { ApiError } from '../lib/api'
import { getErrorMessage } from '../constants/errors'

export type ErrorHandler = (error: unknown) => string

export function useErrorHandler(): ErrorHandler {
  return useCallback((error: unknown): string => {
    if (error instanceof ApiError) {
      return getErrorMessage(error.code)
    }
    if (error instanceof Error) {
      return error.message
    }
    return 'An unexpected error occurred. Please try again.'
  }, [])
}
