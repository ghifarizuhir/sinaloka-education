# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- TypeScript 5.7-5.8 - Backend (NestJS), frontend apps (React), and E2E tests (Playwright)
- JavaScript - Configuration files, build scripts

**Secondary:**
- HTML/CSS - Email templates (inline styled), TailwindCSS stylesheets
- SQL - PostgreSQL via Prisma ORM

## Runtime

**Environment:**
- Node.js v25.5.0 (current environment)
- npm 11.8.0

**Package Manager:**
- npm (used across all packages)
- Lockfile: `package-lock.json` (present in each directory)

## Frameworks

**Backend:**
- NestJS 11.0.1 - Core framework
  - `@nestjs/core` 11.0.1 - Framework core
  - `@nestjs/config` 4.0.3 - Environment configuration
  - `@nestjs/jwt` 11.0.2 - JWT authentication
  - `@nestjs/passport` 11.0.5 - Passport integration
  - `@nestjs/platform-express` 11.0.1 - Express HTTP server
  - `@nestjs/schedule` 6.1.1 - Scheduled tasks (cron jobs)
  - `@nestjs/testing` 11.0.1 - Testing utilities

**Frontend (Platform/Tutors/Parent):**
- React 19.0.0 - UI framework
  - `react-dom` 19.0.0
  - `@vitejs/plugin-react` 5.0.4 - Vite React plugin
- Vite 6.2.0 - Build tool and dev server
  - Ports: Platform (3000), Tutors (5173), Parent (5174)
- React Router DOM 7.13.1 (Platform + Tutors only; Parent uses state-based routing — no React Router)
- TailwindCSS 4.1.14 - Styling
  - `@tailwindcss/vite` 4.1.14 - Vite integration

**Data Management:**
- Prisma 7.5.0 - ORM
  - `@prisma/client` 7.5.0 - Client library
  - `@prisma/adapter-pg` 7.5.0 - PostgreSQL adapter
  - Schema: `prisma/schema.prisma`
  - Generated client: `generated/prisma/` (output configured as CJS)

**HTTP & API:**
- Axios 1.13.6 - HTTP client (all frontend apps)
  - Custom interceptors in `src/lib/api.ts` (Platform) for JWT refresh, impersonation, auth handling
- Custom interceptors in `src/api/client.ts` (Tutors, Parent) for JWT refresh via `auth:logout` event dispatch
- Express 4.21.2 - HTTP server dependency (used in frontend dev servers)

**State Management & Data Fetching:**
- TanStack Query (React Query) 5.90.21 (Platform only) - Data fetching, caching, synchronization
- Manual useState/useEffect hooks (Tutors + Parent) - Custom data fetching without query cache
- Context API - Custom auth context (all frontend apps)

**UI Components & Styling:**
- Radix UI 1.4.3 - Headless component library
- Lucide React 0.546.0 - Icon library
- Sonner 2.0.7 (Platform only) - Toast notifications
- Class Variance Authority 0.7.1 (Platform only) - CSS class composition
- Motion 12.23.24 - Framer Motion animation library (all frontend apps)
- clsx 2.1.1 - Conditional CSS classes
- tailwind-merge 3.5.0 - Merge TailwindCSS classes without conflicts

**Charting (Platform only):**
- Recharts 3.8.0 - Data visualization

**Validation & Schema:**
- Zod 4.3.6 - Schema validation (backend)
- nestjs-zod 5.1.1 - NestJS + Zod integration (backend DTOs)

**Authentication & Security:**
- Passport.js 4.0.1 - Authentication middleware
- passport-jwt 4.0.1 - JWT strategy
- bcrypt 6.0.0 - Password hashing

**Utilities:**
- date-fns 4.1.0 - Date formatting and manipulation
- uuid 13.0.0 - UUID generation
- dotenv 17.2.3 - Environment variable loading

**AI Integration:**
- @google/genai 1.29.0 - Google Gemini API client (Platform + Tutors)

**CSV/PDF:**
- csv-parse 6.1.0 - CSV parsing (backend)
- csv-stringify 6.6.0 - CSV generation (backend)
- pdfkit 0.18.0 - PDF generation (backend)
  - `@types/pdfkit` 0.17.5 (dev)

**Database:**
- pg 8.20.0 - PostgreSQL client (native driver)
  - `@types/pg` 8.18.0 (dev)

**Email:**
- Resend 6.9.3 - Email delivery service

**Internationalization:**
- i18next 25.8.18 - Translation framework
- react-i18next 16.5.8 - React i18n integration

## Configuration

**Environment:**
- `.env.example` files in each directory document required variables
- Backend (`.env.example`):
  - `DATABASE_URL` - PostgreSQL connection
  - `JWT_SECRET`, `JWT_REFRESH_SECRET` - Auth tokens
  - `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY` - Token lifetimes (15m, 7d)
  - `UPLOAD_DIR`, `UPLOAD_MAX_SIZE` - File uploads
  - `PORT` - Server port (default 3000)
  - `RESEND_API_KEY` - Email service
  - `TUTOR_PORTAL_URL`, `PARENT_PORTAL_URL` - Frontend URLs
  - `EMAIL_FROM` - Sender email
  - `WHATSAPP_*` - WhatsApp Cloud API (optional)
- Frontend (`.env.example`):
  - `VITE_API_URL` - Backend API URL (default: http://localhost:5000)
  - `GEMINI_API_KEY` - Google Gemini API key (Platform + Tutors)
  - `APP_URL` - Application URL (Tutors only - AI Studio deployment)

**Build:**
- `vite.config.ts` - Vite configuration (all frontend apps)
  - React plugin enabled
  - TailwindCSS v4 Vite plugin
  - Path alias: `@/` → root directory
  - Allowed hosts for tunneling: `.trycloudflare.com`, `.ngrok-free.app`
  - HMR control via `DISABLE_HMR` env var

**TypeScript:**
- Backend (`tsconfig.json`):
  - Target: ES2023
  - Module: nodenext
  - ESM with package.json exports resolution
  - Decorator support enabled
  - Path mapping for absolute imports
- Frontend (`tsconfig.json`):
  - Target: ES2022
  - Module: ESNext
  - Bundler module resolution
  - JSX: react-jsx
  - Path alias: `@/` → project root
  - NoEmit (Vite handles compilation)

## Testing Frameworks

**Backend:**
- Jest 30.0.0 - Unit and E2E testing
  - Config: jest settings in `package.json`
  - Global setup/teardown: `test/jest-global-setup.ts`, `test/jest-global-teardown.ts`
  - Module mapper for Prisma CJS compatibility: `generated/prisma/client` → `test/prisma-client-shim`
  - Transform: ts-jest for TypeScript
- Supertest 7.0.0 - HTTP assertion library
- @nestjs/testing 11.0.1 - NestJS test utilities

**Frontend:**
- Playwright 1.58.2 - E2E testing (Platform only)
  - Config: `e2e/playwright.config.ts`
  - Two projects: light-mode and dark-mode
  - Baseurl: http://localhost:3000
  - Test directory: `e2e/specs/`
  - Fixtures in `e2e/fixtures/`
  - Mock data in `e2e/mocks/`
  - Helper utilities in `e2e/helpers/`
  - Page objects pattern in `e2e/pages/`

## Build & Development Tools

**Linting & Formatting:**
- ESLint 9.18.0 (backend) - Code linting
  - Config: `@eslint/js`, `typescript-eslint`, `eslint-plugin-prettier`
- TypeScript tsc (frontend) - Type checking (no auto-fix)
- Prettier 3.4.2 (backend) - Code formatting

**TypeScript Compilation:**
- ts-jest 29.2.5 - Jest TypeScript transformer (backend)
- ts-loader 9.5.2 - Webpack TypeScript loader
- ts-node 10.9.2 - Direct TypeScript execution
- tsconfig-paths 4.2.0 - TypeScript path resolution
- tsx 4.21.0 - High-performance TypeScript executor (used for Prisma seed)

**Type Generation:**
- Prisma 7.5.0 - Generates TypeScript types from schema
  - Post-generation script writes `package.json` to `generated/prisma/`

**Other Build Tools:**
- autoprefixer 10.4.21 - PostCSS vendor prefixes
- Rollup (via Vite) - JavaScript bundler
- source-map-support 0.5.21 - Source map support for Node.js

## Platform Requirements

**Development:**
- Node.js v25.5.0+ recommended
- npm 11.8.0+
- PostgreSQL 12+ (for DATABASE_URL)
- For WhatsApp integration: Business Account, Verified Phone Number, API credentials
- For Email: Resend API key
- For Gemini AI: Google Cloud API key

**Production:**
- Node.js runtime (backend service)
- PostgreSQL database
- File storage: Local filesystem (via `UPLOAD_DIR`) or cloud storage proxy
- Email service: Resend
- Optional: WhatsApp Cloud API for messaging
- Optional: Google Cloud for Gemini API

---

*Stack analysis: 2026-03-19*
