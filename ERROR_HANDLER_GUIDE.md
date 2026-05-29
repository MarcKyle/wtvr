# Error Message Handler Guide

## Overview

This app implements a centralized error message handler system that provides user-friendly error messages for common types of errors. The system uses **error codes** to map server-side errors to consistent, human-readable messages on the client side.

## Architecture

### Error Codes

Error codes are defined in two places:
- **Server:** `server/src/constants/errors.ts`
- **Client:** `src/constants/errors.ts`

These enums ensure consistent error identification across the stack.

### Error Types

#### 1. **Authentication Errors**
- `invalid_credentials` → "Incorrect account details. Please check your email and password."
- `account_locked` → "Your account has been temporarily locked due to too many failed login attempts. Please try again later."
- `account_inactive` → "Your account is disabled. Please contact support."

#### 2. **Registration Errors**
- `email_already_exists` → "An account with this email already exists. Try signing in instead."
- `invalid_role` → "The selected role is not available at registration."

#### 3. **Validation Errors**
- `invalid_email` → "Please enter a valid email address."
- `weak_password` → "Password must be at least 8 characters with uppercase, lowercase, number, and symbol."
- `password_mismatch` → "Passwords do not match."
- `missing_field` → "Please fill in all required fields."

#### 4. **Authorization Errors**
- `authentication_required` → "You must be signed in to access this."
- `forbidden` → "You do not have permission to access this."

#### 5. **Rate Limiting**
- `too_many_attempts` → "Too many attempts. Please try again later."

#### 6. **Generic Errors**
- `request_failed` → "Request failed. Please try again."
- `invalid_request` → "Invalid request. Please check your input."
- `server_error` → "Something went wrong. Please try again later."

## How It Works

### Server Side

#### 1. **API Routes** (`server/src/routes/auth.ts`)
Routes return structured error responses with both `error` message and `code`:
```json
{
  "error": "Incorrect account details.",
  "code": "invalid_credentials"
}
```

#### 2. **Middleware** (`server/src/middleware/`)

**Validation Middleware** (`validate.ts`):
- Validates request bodies using Zod schemas
- Returns validation details with error code

**Auth Middleware** (`auth.ts`):
- Checks authentication/authorization
- Returns structured error responses with codes

#### 3. **Error Handler** (`server/src/index.ts`)
- Global error handler catches unhandled exceptions
- Returns consistent error format with code
- Includes error details in development, hides in production

### Client Side

#### 1. **API Wrapper** (`src/lib/api.ts`)
- `ApiError` class extends Error with `code` and `status` properties
- Parses error responses and extracts both message and code
- Throws `ApiError` instead of generic Error

#### 2. **Error Message Mapper** (`src/constants/errors.ts`)
- `getErrorMessage(code)` function maps error codes to user-friendly strings
- Used throughout the UI to display messages to users

#### 3. **Error Handler Hook** (`src/hooks/useErrorHandler.ts`)
- `useErrorHandler()` returns a function to convert errors to messages
- Can be used in any component that makes API calls
- Handles `ApiError`, generic `Error`, and unknown errors

#### 4. **Auth Pages** (`src/pages/Login/Login.tsx`, `src/pages/Register/Register.tsx`)
- Catch errors from API calls
- Use `ApiError.code` to look up user-friendly message via `getErrorMessage()`
- Display mapped message to user

## Usage Examples

### In a Page Component
```tsx
import { ApiError } from '../../lib/api'
import { getErrorMessage } from '../../constants/errors'

async function handleSubmit() {
  try {
    await authService.login({ email, password })
  } catch (err) {
    if (err instanceof ApiError) {
      // Maps error code to user-friendly string
      setError(getErrorMessage(err.code))
    } else {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }
}
```

### Using the Hook
```tsx
import { useErrorHandler } from '../../hooks/useErrorHandler'

function MyComponent() {
  const handleError = useErrorHandler()
  
  async function doSomething() {
    try {
      // ...
    } catch (err) {
      // Returns user-friendly message
      const message = handleError(err)
      showNotification(message)
    }
  }
}
```

## Adding New Errors

### Server Side
1. Add error code to `server/src/constants/errors.ts`
2. Return the code in your API response alongside the error message
3. Example:
   ```ts
   res.status(400).json({ 
     error: 'Something failed', 
     code: ERROR_CODES.NEW_ERROR_TYPE 
   })
   ```

### Client Side
1. Add code to `src/constants/errors.ts`
2. Add mapping to `getErrorMessage()` function
3. Use `getErrorMessage(error.code)` when catching the error

## Best Practices

1. **Always use error codes** - Never send raw error messages to the client
2. **Keep messages user-friendly** - Avoid technical jargon
3. **Be consistent** - Use the same code for the same type of error everywhere
4. **Handle at the source** - Pages that make API calls should handle errors, not pass them up
5. **Log details server-side** - Include full error details in logs for debugging, only send friendly message to client
6. **Test error paths** - Write tests for error scenarios to ensure messages are displayed correctly

## Security Considerations

- ❌ **Don't leak information:** "User not found" reveals which emails exist; use generic "Incorrect account details"
- ❌ **Don't expose system errors:** Never show database errors or stack traces to users
- ✅ **Use generic fallbacks:** Have a catch-all "Something went wrong" message for unexpected errors
- ✅ **Log everything server-side:** Keep audit trail in application logs, not in user messages
