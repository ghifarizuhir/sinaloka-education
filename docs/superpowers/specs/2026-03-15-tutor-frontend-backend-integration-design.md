# Tutor Frontend–Backend Integration Design

**Date:** 2026-03-15
**Status:** Approved

## Overview

Integrate the `sinaloka-tutors` React frontend with the `sinaloka-backend` NestJS API. The frontend currently uses mock data with no authentication. This design adds an API client, auth flow, data hooks, and a mapping layer — while keeping all existing UI components unchanged.

## Constraints

- Backend has active development — minimize backend changes.
- Backend additions are additive only — new methods on existing controllers, no modifications to existing methods.
- Frontend types and component props remain unchanged; a mapping layer handles conversion.

## Architecture

Three layers are added to the existing frontend:

1. **API client** (`src/api/client.ts`) — Axios instance with base URL, JWT interceptor, automatic token refresh on 401.
2. **Auth context** (`src/contexts/AuthContext.tsx`) — React context managing login state. Access token stored in-memory, refresh token in localStorage.
3. **Data hooks** (`src/hooks/`) — Custom hooks that call the API, transform responses, and expose `{ data, isLoading, error, refetch }`.

## Deployment

- Separate dev servers: Vite on port 5173, backend on port 3000.
- Vite proxy forwards `/api` requests to the backend (merge into existing `server` block in `vite.config.ts`).
- Deployed independently. For production, backend CORS must be configured for the frontend origin.

## Authentication Flow

1. Tutor enters email/password on a login page.
2. `POST /api/auth/login` with `{ email, password }` returns `{ access_token, refresh_token, token_type, expires_in }` (snake_case).
3. Access token stored in-memory (React state), refresh token in localStorage.
4. Axios interceptor attaches `Authorization: Bearer <access_token>` to all requests.
5. On 401, interceptor calls `POST /api/auth/refresh` with body `{ refresh_token: "..." }`. If refresh fails, clear all tokens and redirect to login. Concurrent 401s must be serialized — queue pending requests while a single refresh is in-flight to avoid revoking each other's tokens.
6. Logout calls `POST /api/auth/logout` with body `{ refresh_token: "..." }`. The logout endpoint requires a valid JWT (no `@Public()` decorator). If the access token is expired, the frontend should attempt logout, catch the 401, and proceed to clear local tokens anyway. Always clear local tokens regardless of whether the API call succeeds.

## Data Mapping

All backend responses use snake_case. The mapping layer converts to camelCase frontend types.

### Paginated Response Envelope

All tutor-facing list endpoints (`/tutor/schedule`, `/tutor/payouts`) return a flat paginated shape:
```json
{ "data": [...], "total": 42, "page": 1, "limit": 20 }
```

Note: some admin endpoints use a different shape with `meta: { total, page, limit, totalPages, ... }`. The tutor hooks only deal with the flat shape above.

Hooks must unwrap `.data` from this envelope.

### Schedule: Backend → Frontend

Backend response (each item in `data` array):
```json
{ "id": "uuid", "date": "2026-03-15", "start_time": "14:00", "end_time": "15:30", "status": "SCHEDULED", "topic_covered": null, "session_summary": null, "class": { "subject": "Fisika Dasar", "room": "Room A" } }
```

Frontend `ClassSchedule` type:
```json
{ "id": "uuid", "date": "2026-03-15", "startTime": "14:00", "endTime": "15:30", "status": "upcoming", "subject": "Fisika Dasar", "location": "Room A", "students": [], "topicCovered": null, "sessionSummary": null }
```

**Field mapping:**
- `start_time` → `startTime`
- `end_time` → `endTime`
- `class.subject` → `subject`
- `class.room` → `location` (nullable — default to `""` if null)
- `topic_covered` → `topicCovered`
- `session_summary` → `sessionSummary`
- `students` is always `[]` initially — fetched separately via the students endpoint when opening attendance view
- `ClassSchedule.notes` from the frontend type has no backend equivalent — left as `undefined`

**Status mapping:**
| Backend | Frontend |
|---|---|
| `SCHEDULED` | `upcoming` |
| `COMPLETED` | `completed` |
| `CANCELLED` | `cancelled` |
| `RESCHEDULE_REQUESTED` | `rescheduled` |

### Payouts: Backend → Frontend

Backend: `{ id, amount, date, status, description, proof_url }`
Frontend: `{ id, amount, date, status, description, proofUrl }`

**Nullable fields:** Backend `description` is nullable (`String?`), but frontend type requires `description: string`. Mapper defaults null to `""`. Same for `proof_url` → `proofUrl` (already optional in frontend type).

**Payout status mapping:**
| Backend | Frontend |
|---|---|
| `PENDING` | `pending` |
| `PROCESSING` | `pending` |
| `PAID` | `paid` |

`PROCESSING` maps to `pending` since the frontend only has two states and from the tutor's perspective, processing means not yet paid.

### Profile: Backend → Frontend

Backend (from `GET /api/tutor/profile`):
```json
{ "id": "tutor-uuid", "subjects": ["Math", "Physics"], "rating": 4.9, "is_verified": true, "experience_years": 5, "bank_name": "BCA", "bank_account_number": "123", "bank_account_holder": "Ghifari", "user": { "id": "user-uuid", "name": "Ghifari Zuhir", "email": "ghifari@example.com", "role": "TUTOR", "is_active": true } }
```

Frontend `TutorProfile` type:
```json
{ "id": "tutor-uuid", "name": "Ghifari Zuhir", "email": "ghifari@example.com", "subject": "Math", "rating": 4.9, "avatar": "https://picsum.photos/seed/<user-id>/300/300" }
```

**Field mapping:**
- `user.name` → `name`
- `user.email` → `email`
- `subjects[0]` → `subject`
- `avatar` — the User model has `avatar_url` but the tutor profile query does not select it. Use a deterministic placeholder: `https://picsum.photos/seed/<user.id>/300/300`. If avatar support is needed later, the backend user select can be updated separately.

### Attendance: Frontend → Backend

Frontend collects per-student data: `{ id, attendance: "P" | "A" | "L", homeworkDone: boolean, note?: string }`

Maps to backend batch create:
```json
{ "session_id": "uuid", "records": [{ "student_id": "uuid", "status": "PRESENT", "homework_done": true, "notes": null }] }
```

**Attendance status mapping:** `P` → `PRESENT`, `A` → `ABSENT`, `L` → `LATE`

**Note:** Frontend type uses `note` (singular), backend uses `notes` (plural). Mapper must handle this.

## Backend Additions

All additions are new methods on existing controllers/services. No modifications to existing methods.

### 1. `GET /api/tutor/schedule/:id/students`

Returns enrolled students for a session's class, with any existing attendance records for that session.

**Authorization:** TUTOR role, must own the session (via class → tutor_id).

**Response:**
```json
{
  "students": [
    { "id": "student-uuid", "name": "Siti Aminah", "grade": "Grade 11", "attendance": null, "homework_done": false, "notes": null }
  ]
}
```

**Implementation:** Query `Enrollment` (where class_id = session's class_id, status = ACTIVE) → join `Student` for name/grade → left join `Attendance` (where session_id) for existing records.

**Files:** Add method to `tutor-session.controller.ts` and `session.service.ts`.

### 2. `PATCH /api/tutor/schedule/:id/complete`

Marks a session as completed with topic and summary. Required because the existing `UpdateSession` endpoint is admin-only.

**Authorization:** TUTOR role, must own the session (via class → tutor_id). Session must have status `SCHEDULED`.

**Request body:**
```json
{ "topic_covered": "Algebraic Fractions", "session_summary": "Student grasped the basics well." }
```

**Validation:** `topic_covered` is required (string, min 1, max 500). `session_summary` is optional (string, max 2000).

**Implementation:** Verify ownership, verify status is SCHEDULED, update `{ status: COMPLETED, topic_covered, session_summary }`.

**Files:** Add method to `tutor-session.controller.ts`, `session.service.ts`, and add `CompleteSessionSchema` to `session.dto.ts`.

## Attendance + Completion Flow

The "Finalize & Close" button in the frontend triggers two API calls in sequence:

1. `POST /api/tutor/attendance` — batch create attendance records for all students.
2. `PATCH /api/tutor/schedule/:id/complete` — mark session as completed with topic and summary.

If step 1 succeeds but step 2 fails, attendance is still saved (correct). The frontend shows an error toast and the tutor can retry completion.

## Schedule Filtering

Each filter tab calls the API with the corresponding `status` query param:
- Upcoming → `GET /api/tutor/schedule?status=SCHEDULED`
- Completed → `GET /api/tutor/schedule?status=COMPLETED`
- Cancelled → `GET /api/tutor/schedule?status=CANCELLED`

The frontend filter buttons currently have no state or click handlers. The `useSchedule` hook will expose `{ activeFilter, setFilter }` state, and `App.tsx` will wire the buttons to `setFilter` which triggers a new API call.

## Error Handling

- **401** — attempt token refresh (serialized); if fails, redirect to login.
- **403** — toast: "Anda tidak memiliki akses".
- **404** — contextual toast (e.g., "Sesi tidak ditemukan").
- **400** — display first validation error message from response.
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
│   ├── useAttendance.ts       # Fetch students, submit attendance batch + complete
│   └── useAuth.ts             # Convenience hook for AuthContext
├── mappers/
│   └── index.ts               # Backend ↔ Frontend type transformations
└── pages/
    └── LoginPage.tsx           # Email/password login form
```

### Modified files in `sinaloka-tutors/`

- `App.tsx` — remove mock imports, add AuthProvider wrapper, login gate, consume hooks, wire filter tabs with state.
- `vite.config.ts` — add proxy config to existing `server` block: `/api` → `http://localhost:3000`.
- `package.json` — add `axios` dependency.
- `mockData.ts` — deleted.

### Backend files (additive only)

- `tutor-session.controller.ts` — add `getSessionStudents` and `completeSession` methods.
- `session.service.ts` — add `getSessionStudents` and `completeSession` methods.
- `session.dto.ts` — add `CompleteSessionSchema` and `CompleteSessionDto`.

No changes to existing methods in any of these files.
