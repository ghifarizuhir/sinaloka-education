# Sinaloka Education

A multi-tenant tutoring institution management system for managing students, tutors, sessions, attendance, billing, and more.

## Apps

| App | Description | Port |
|-----|-------------|------|
| **sinaloka-backend** | NestJS API server | 5000 |
| **sinaloka-platform** | Admin dashboard (React) | 3000 |
| **sinaloka-tutors** | Tutor-facing app (React) | 5173 |
| **sinaloka-parent** | Parent-facing mobile-first app (React) | 5174 |

## Tech Stack

- **Backend**: NestJS, Prisma, PostgreSQL
- **Frontend**: React, Vite, TailwindCSS v4, TanStack Query
- **Auth**: JWT with refresh tokens
- **Architecture**: Multi-tenant with institution-scoped data isolation

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm

### Backend

```bash
cd sinaloka-backend
npm install
cp .env.example .env        # configure DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev      # run database migrations
npx prisma db seed           # seed initial data
npm run start:dev            # start dev server on port 5000
```

### Frontend Apps

```bash
# Admin Platform
cd sinaloka-platform
npm install
npm run dev                  # http://localhost:3000

# Tutor App
cd sinaloka-tutors
npm install
npm run dev                  # http://localhost:5173

# Parent App
cd sinaloka-parent
npm install
npm run dev                  # http://localhost:5174
```

## Project Structure

```
sinaloka/
├── sinaloka-backend/        # NestJS API
│   ├── src/modules/         # Domain modules (student, session, billing, etc.)
│   ├── src/common/          # Guards, interceptors, decorators
│   └── prisma/              # Schema & migrations
├── sinaloka-platform/       # Admin dashboard
├── sinaloka-tutors/         # Tutor app
└── sinaloka-parent/         # Parent app
```

## License

Private — All rights reserved.
