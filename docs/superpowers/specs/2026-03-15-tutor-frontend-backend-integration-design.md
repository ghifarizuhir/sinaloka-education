# Tutor Frontend–Backend Integration Design

**Date:** 2026-03-15
**Status:** Approved

## Overview

Integrate the `sinaloka-tutors` React frontend with the `sinaloka-backend` NestJS API. The frontend currently uses mock data with no authentication. This design adds an API client, auth flow, data hooks, and a mapping layer — while keeping all existing UI components unchanged.

## Constraints

- Backend has active development — minimize backend changes.
- Only one new backend endpoint is added (additive, no modifications to existing endpoints).
- Frontend types and component props remain unchanged; a mapping layer handles conversion.

## Architecture

Three layers are added to the existing frontend:

1. **API client** (`src/api/client.ts`) — Axios instance with base URL, JWT interceptor, automatic token refresh on 401.
2. **Auth context** (`src/contexts/AuthContext.tsx`) — React context managing login state. Access token stored in-memory, refresh token in localStorage.
3. **Data hooks** (`src/hooks/`) — Custom hooks that call the API, transform responses, and expose `{ data, isLoading, error, refetch }`.

## Deployment

- Separate dev servers: Vite on port 5173, backend on port 3000.
- Vite proxy forwards `/api` requests to the backend.
- Deployed independently.

## Authentication Flow

1. Tutor enters email/password on a login page.
2. `POST /api/auth/login` returns `{ accessToken, refreshToken }`.
3. Access token stored in-memory (React state), refresh token in localStorage.
4. Axios interceptor attaches `Authorization: Bearer <accessToken>` to all requests.
5. On 401, interceptor calls `POST /api/auth/refresh` with the refresh token. If refresh fails, clear tokens and redirect to login.
6. Logout calls `POST /api/auth/logout` and clears all tokens.

## Data Mapping

### Schedule: Backend → Frontend

Backend response:
```json
{ "id": "uuid", "date": "2026-03-15", "start_time": "14:00", "end_time": "15:30", "status": "SCHEDULED", "class": { "subject": "Fisika Dasar", "location": "..." } }
```

Frontend `ClassSchedule` type:
```json
{ "id": "uuid", "date": "2026-03-15", "startTime": "14:00", "endTime": "15:30", "status": "upcoming", "subject": "Fisika Dasar", "location": "...", "students": [] }
```

**Status mapping:**
| Backend | Frontend |
|---|---|
| `SCHEDULED` | `upcoming` |
| `COMPLETED` | `completed` |
| `CANCELLED` | `cancelled` |
| `RESCHEDULE_REQUESTED` | `rescheduled` |

### Payouts: Backend → Frontend

Backend: `{ id, amount, date, status: "PENDING", description, proof_url }`
Frontend: `{ id, amount, date, status: "pending", description, proofUrl }`

### Profile: Backend → Frontend

Backend: `{ id, subjects, rating, is_verified, user: { name, email } }`
Frontend: `{ id, name: user.name, email: user.email, subject: subjects[0], rating, avatar: placeholder }`

### Attendance: Frontend → Backend

Frontend `{ student_id, attendance: "P", homeworkDone }` maps to:
```json
{ "session_id": "uuid", "records": [{ "student_id": "uuid", "status": "PRESENT", "homework_done": true, "notes": null }] }
```

Attendance status: `P` → `PRESENT`, `A` → `ABSENT`, `L` → `LATE`

## Backend Addition

### `GET /api/tutor/schedule/:id/students`

Returns enrolled students for a session's class, with any existing attendance records for that session.

**Authorization:** TUTOR role, must own the session (via class → tutor_id).

**Response:**
```json
{
  "students": [
    { "id": "uuid", "name": "Siti Aminah", "grade": "Grade 11", "attendance": null, "homework_done": false, "notes": null }
  ]
}
```

**Implementation:** Fetches from `enrollment` (students in the class) joined with `attendance` (existing records for the session). If attendance hasn't been marked, fields are null/default.

**Files touched:**
- `tutor-session.controller.ts` — add `@Get(':id/students')` method
- `session.service.ts` — add `getSessionStudents(userId, sessionId)` method

No changes to existing methods, DTOs, or other modules.

## Schedule Filtering

Each filter tab (Upcoming, Completed, Cancelled) calls the API with the corresponding `status` query param:
- Upcoming → `GET /api/tutor/schedule?status=SCHEDULED`
- Completed → `GET /api/tutor/schedule?status=COMPLETED`
- Cancelled → `GET /api/tutor/schedule?status=CANCELLED`

## Error Handling

- **401** — attempt token refresh; if fails, redirect to login.
- **403** — toast: "Anda tidak memiliki akses".
- **404** — contextual toast (e.g., "Sesi tidak ditemukan").
- **400** — display first validation error from response.
- **Network error** — toast: "Koneksi gagal, coba lagi".

## Loading States

- Each hook exposes `{ data, isLoading, error, refetch }`.
- Skeleton/pulse placeholders (stone-900 themed) shown while loading.
- No full-page loading screen — sections load independently.

## Optimistic Updates

- Cancel session: update local state immediately, revert on failure.
- Attendance submission: show success toast, revert if API fails.
- Filter tab switch: show loading in list area only, tabs stay interactive.

## File Structure

### New files in `sinaloka-tutors/src/`

```
src/
├── api/
│   └── client.ts              # Axios instance, JWT interceptor, refresh logic
├── contexts/
│   └── AuthContext.tsx         # Auth state, login/logout, token management
├── hooks/
│   ├── useSchedule.ts         # Fetch/filter schedule, cancel, reschedule
│   ├── usePayouts.ts          # Fetch payouts with pagination
│   ├── useProfile.ts          # Fetch/update tutor profile
│   ├── useAttendance.ts       # Fetch students, submit attendance batch
│   └── useAuth.ts             # Convenience hook for AuthContext
├── mappers/
│   └── index.ts               # Backend ↔ Frontend type transformations
└── pages/
    └── LoginPage.tsx           # Email/password login form
```

### Modified files

- `App.tsx` — remove mock imports, add AuthProvider wrapper, login gate, consume hooks.
- `vite.config.ts` — add proxy config for `/api` → `http://localhost:3000`.
- `package.json` — add `axios` dependency.
- `mockData.ts` — deleted.

### Backend files (additive only)

- `tutor-session.controller.ts` — add one new method.
- `session.service.ts` — add one new method.
