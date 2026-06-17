# Authentication System Guide

## Overview

The authentication system provides a centralized context that manages:
- **User identity** stored in memory (never localStorage)
- **Access token** stored in memory
- **Refresh token** stored in httpOnly cookie (managed by server)
- **Session restoration** on app load via refresh endpoint
- **Axios interceptors** for automatic token attachment and 401 handling

## Architecture

### Core Components

1. **AuthContext** (`src/context/AuthContext.tsx`)
   - Stores `user`, `accessToken`, `isLoading`, `isAuthenticated`
   - Provides `setUser()`, `setAccessToken()`, `restoreSession()`, `logout()`
   - On mount, calls `/auth/refresh` to restore session

2. **API Client** (`src/api/apiClient.ts`)
   - Axios instance with interceptors
   - Request interceptor: Attaches Bearer token to all requests
   - Response interceptor: Handles 401, refreshes token, retries request
   - Uses global event system to sync token updates with AuthContext

3. **useAuth Hook** (`src/hooks/useAuth.ts`)
   - Simple hook to access AuthContext
   - Throws error if used outside AuthProvider

4. **ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
   - Wrapper component for protected pages
   - Shows loading state during session check
   - Redirects to `/login` if not authenticated

5. **useGlobalAuthEvents** (`src/context/useGlobalEvents.ts`)
   - Listens for token refresh events from API interceptor
   - Listens for session expiration events
   - Updates AuthContext when tokens are refreshed

## Authentication Flow

### Initial App Load
```
App mounts
  ↓
AuthProvider initializes
  ↓
restoreSession() called
  ↓
POST /auth/refresh (with httpOnly cookie)
  ↓
✓ Success: Set user + accessToken
✗ Failed: Keep user/token as null
  ↓
isLoading = false, render content
```

### API Request with Token Refresh
```
Component calls API
  ↓
Request interceptor: Attach Bearer token
  ↓
API responds 200 ✓
  ↓
Return response

OR

API responds 401 (token expired)
  ↓
Response interceptor: Attempt refresh
  ↓
POST /auth/refresh (with httpOnly cookie)
  ↓
✓ Get new accessToken
  ↓
Dispatch 'tokenRefreshed' event
  ↓
useGlobalAuthEvents updates AuthContext
  ↓
Retry original request with new token
  ↓
Return response

OR

POST /auth/refresh fails
  ↓
Dispatch 'sessionExpired' event
  ↓
useGlobalAuthEvents calls logout()
  ↓
Redirect to /login
```

### Logout
```
User clicks logout
  ↓
Call auth.logout()
  ↓
POST /auth/logout (invalidate refresh token)
  ↓
Clear user + accessToken from memory
  ↓
Redirect to /login
```

## Usage in Components

### Using Auth Context

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, logout, accessToken } = useAuth();

  return (
    <div>
      {isAuthenticated && <p>Welcome {user?.fullName}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Setting User After Login

Once you implement the login form, set the user and token after successful login:

```typescript
import { useAuth } from '@/hooks/useAuth';
import { setGlobalAccessToken } from '@/api/apiClient';

function LoginForm() {
  const { setUser, setAccessToken } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    
    // Set user in memory
    setUser(response.data.user);
    
    // Set access token in memory
    const token = response.data.accessToken;
    setAccessToken(token);
    setGlobalAccessToken(token); // Sync with API client
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  // ... form JSX
}
```

### Protected Route Usage

Wrap pages that require authentication:

```typescript
<Route
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

## Key Security Principles

1. **Access Token in Memory**: Never persisted to localStorage/sessionStorage
   - Lost on page refresh (but restored via /auth/refresh)
   - Not accessible to XSS attacks stored in persistent storage

2. **Refresh Token in httpOnly Cookie**:
   - Not accessible to JavaScript (protected from XSS)
   - Automatically sent by browser in requests
   - Server controls expiration and invalidation

3. **Token Refresh on 401**: Automatic and transparent
   - Failed refresh logs user out
   - Original request is retried after token refresh

4. **CORS & Credentials**: 
   - `withCredentials: true` ensures cookies are sent
   - Backend must have proper CORS headers

## API Endpoints Required

Your backend must implement these endpoints:

### POST /auth/login
**Request**: `{ email: string, password: string }`
**Response**: 
```json
{
  "user": { "id": "...", "fullName": "...", "email": "...", "firstName": "..." },
  "accessToken": "jwt..."
}
```
**Cookies**: Sets httpOnly refresh token

### POST /auth/refresh
**Request**: (empty body)
**Response**:
```json
{
  "user": { "id": "...", "fullName": "...", "email": "...", "firstName": "..." },
  "accessToken": "jwt..."
}
```
**Cookies**: Reads httpOnly refresh token

### POST /auth/logout
**Request**: (empty body)
**Response**: `{ "message": "Logged out" }`
**Effect**: Invalidates refresh token

## Verification Checklist

- [ ] After login, access token is only in memory (`window.localStorage` has no token)
- [ ] Browser refresh while logged in restores session without showing login
- [ ] After logout, `user` and `accessToken` are null and user is on `/login`
- [ ] Visiting `/dashboard` while unauthenticated redirects to `/login`
- [ ] API returns 401 → token refreshes automatically → request retries
- [ ] `isLoading` is true during initial session check, false after resolution
- [ ] Access token persists in memory during navigation
- [ ] Refresh token only in httpOnly cookie (inspect with Network tab)

## Next Steps

1. Implement login form component (`src/pages/LoginPage.tsx`)
2. Implement signup/registration if needed
3. Add refresh token rotation logic in backend
4. Test silent token refresh scenarios
5. Add role-based access control if needed
