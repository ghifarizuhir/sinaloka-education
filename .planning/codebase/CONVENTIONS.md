# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- Services: `*.service.ts` (e.g., `student.service.ts`, `classes.service.ts`)
- Controllers: `*.controller.ts` (e.g., `student.controller.ts`)
- DTOs: `*.dto.ts` (e.g., `student.dto.ts`)
- Guards/Pipes/Filters: `*.guard.ts`, `*.pipe.ts`, `*.filter.ts`
- React components: `PascalCase.tsx` (e.g., `ScheduleWeekPreview.tsx`)
- React hooks: `use*.ts` (e.g., `useStudents.ts`, `useClasses.ts`)
- Pages: `CamelCase/*.tsx` or `*Page.tsx` structure
- Service exports (frontend): `*.service.ts` (e.g., `students.service.ts`)

**Functions:**
- camelCase for functions (e.g., `formatDate()`, `parseTime()`, `hasConflict()`)
- async functions use async/await pattern (e.g., `async create()`, `async findAll()`)
- Helper functions prefixed with purpose (e.g., `buildPaginationMeta()`, `processQueue()`)

**Variables:**
- camelCase for local variables and constants (e.g., `mockStudent`, `otherClasses`, `isRefreshing`)
- UPPER_SNAKE_CASE for module-level constants (e.g., `START_HOUR`, `END_HOUR`, `PREVIEW_DAYS`)
- Prefix boolean variables with `is` or `has` (e.g., `isDarkMode`, `hasConflict`, `isRefreshing`)
- Private class fields use `private` keyword (e.g., `private readonly prisma: PrismaService`)
- React state uses `const [state, setState]` pattern

**Types:**
- Interface names in PascalCase (e.g., `Student`, `CreateStudentDto`, `JwtPayload`)
- Type aliases in PascalCase (e.g., `StudentQueryParams`, `PaginatedResponse<T>`)
- Enums: `camelCase` for values (e.g., `status: 'ACTIVE' | 'INACTIVE'`)
- Zod schemas: `PascalCaseSchema` (e.g., `CreateStudentSchema`, `StudentQuerySchema`)

## Code Style

**Formatting:**
- Line length: No explicit limit, but favor readability
- Indentation: 2 spaces (via Prettier)
- Trailing commas: enabled (`"trailingComma": "all"` in `.prettierrc`)
- Single quotes: enabled (`"singleQuote": true` in `.prettierrc`)

**Linting:**
- Backend: ESLint with TypeScript support (`eslint.config.mjs`)
  - Rule customizations: `@typescript-eslint/no-explicit-any: off`, `@typescript-eslint/no-floating-promises: warn`
  - Prettier integration enabled
- Frontend: TypeScript type-checking via `tsc --noEmit` (no ESLint config at root)
- Prettier is configured with `endOfLine: "auto"` to handle mixed line endings

## Import Organization

**Order:**
1. External libraries (e.g., `import axios`, `import { Test }`)
2. NestJS modules and decorators
3. Relative imports (e.g., `import { PrismaService }`)
4. Alias imports using path aliases (e.g., `import api from '@/src/lib/api'`)

**Path Aliases:**
- Frontend: `@/*` maps to `./*` (root of `sinaloka-platform`)
- Backend: No path aliases; uses relative imports and NestJS path mapping

**Formatting:**
- One import per line when importing multiple items from a module
- Use destructuring for imports: `import { Test, TestingModule }`
- Group related imports together with blank lines between groups

## Error Handling

**Backend Patterns:**
- Use NestJS built-in HTTP exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`
- Validation errors: ZodValidationPipe transforms Zod errors to BadRequestException with structured field errors
- Error structure: `{ message: string | string[], errors?: Array<{ field: string; message: string }> }`
- Global exception filter: `HttpExceptionFilter` catches all exceptions, logs 5xx errors, returns standardized response with requestId
- Service methods throw exceptions (guards verify permissions, exceptions propagate to filter)

**Frontend Patterns:**
- Axios interceptor handles 401 responses with token refresh logic
- Token refresh uses queue pattern to prevent multiple concurrent refresh attempts
- On final auth failure, tokens are cleared and user redirected to `/login`
- Error responses from API are caught and passed to mutation/query error handlers
- UI displays errors via toast notifications (Sonner)

## Logging

**Backend:**
- Logger from `@nestjs/common` (e.g., `private readonly logger = new Logger(ClassName.name)`)
- Log 5xx errors with request stack trace in `HttpExceptionFilter`
- Log level implicit: errors logged only for server errors

**Frontend:**
- Console logging only (no dedicated logger)
- Debug logging in service interceptors (e.g., token refresh logging via catch block comments)

## Comments

**When to Comment:**
- Complex algorithms: document logic flow (e.g., `parseTime()` in `ScheduleWeekPreview.tsx`)
- Business logic: explain why a decision was made
- Workarounds: mark temporary fixes with notes (implied by error handling patterns)

**JSDoc/TSDoc:**
- Not extensively used; relied upon for API services (inline types sufficient)
- Function parameters documented via TypeScript types (type information is the primary docs)

## Function Design

**Size:**
- Prefer smaller, focused functions (e.g., `hasConflict()` is 8 lines, `parseTime()` is 3 lines)
- Service methods avg 10-20 lines, complex queries build where clauses gradually

**Parameters:**
- Named objects for multiple params: `{ id, data }` pattern in service methods
- Query parameters collected into DTOs (e.g., `StudentQueryDto`)
- Destructuring in function signatures when appropriate

**Return Values:**
- Services return Promise<T> or throw exceptions (no null checks on success paths)
- Controllers return JSON bodies automatically via NestJS serialization
- Frontend services return Promises (via `.then((r) => r.data)`)

## Module Design

**Exports:**
- Backend modules: Services exported via `Module` decorator (providers array)
- Frontend: Named exports for functions, hooks, components
- Barrel files: not used; direct imports from source files

**Patterns:**
- Service method pattern: define object literal with method functions (e.g., `export const studentsService = { getAll: () => ... }`)
- React hooks: exported as named functions (e.g., `export function useStudents() {}`)
- Controllers: class-based with dependency injection
- Services: class-based with `@Injectable()`, dependencies injected via constructor

## Multi-Tenancy & Scoping

**Backend:**
- All service methods accept `institutionId: string` as first parameter
- Queries always include `institution_id` in WHERE clause via `where` object
- User's institution extracted from JWT via `@CurrentUser() user: JwtPayload` decorator
- Super admins can override via `?institution_id=` query param (handled by API interceptor)

**Frontend:**
- Institution impersonation stored in `sessionStorage` as `impersonatedInstitution` JSON
- API client injects `institution_id` query param if impersonation active

## Database & Types

**Prisma:**
- Models use `snake_case` with `@@map()` for PostgreSQL table names
- Generated types imported from `generated/prisma/client`
- Safe parsing of optional fields: convert empty strings to undefined before validation

**DTOs:**
- Created with Zod schemas: define schema, then `export type DtoName = z.infer<typeof DtoSchema>`
- Partial updates use `.partial()`: `UpdateStudentSchema = CreateStudentSchema.partial()`
- Query DTOs use `.coerce` for query string number/date conversion

## Frontend Data Flow

### Platform (Admin Dashboard)
**Service Layer:**
- Services wrap Axios calls: `api.get<T>('/endpoint', { params }).then((r) => r.data)`
- Services are plain objects with methods, not classes
- Error handling deferred to query/mutation hooks

**React Hooks:**
- Use TanStack Query (React Query): `useQuery()`, `useMutation()`
- Hooks provide `data`, `error`, `isLoading`, `isPending` states
- Mutations invalidate related query keys on success: `qc.invalidateQueries({ queryKey: ['students'] })`
- Conditional queries via `enabled` flag (e.g., `enabled: !!id`)

### Tutors + Parent (Mobile Apps)
**Mapper Pattern:**
- Pure mapper functions transform backend responses: `mapSession(raw: any): ClassSchedule`
- Status enums mapped via lookup objects: `SESSION_STATUS_MAP`, `PAYOUT_STATUS_MAP`
- Bidirectional mapping in Tutors: `mapAttendanceToBackend()` converts frontend → backend format
- All mappers accept `any` and return typed objects (no Zod validation at frontend boundary)

**Custom Hooks (no TanStack Query):**
- Hooks use manual `useState`/`useEffect` pattern with explicit `isLoading`/`error` states
- Data fetched via `api.get()` + mapper in `useCallback`
- Refetch exposed as explicit function: `{ data, isLoading, error, refetch }`
- Optimistic updates done via `setData(prev => ...)` with revert on error (e.g., `cancelSession` in `useSchedule`)
- No query cache — each mount triggers a fresh fetch

**State Architecture:**
- All app state lives in `App.tsx` (not in page hooks or separate stores)
- Pages receive data and handlers as props — they are presentational
- Tab navigation managed by `useState<string>('dashboard')`
- Sub-views (e.g., attendance, detail) rendered conditionally based on state flags (not routes)

## Type Safety

**Backend:**
- TypeScript strict mode enabled (experimentalDecorators for NestJS)
- Zod schemas provide runtime validation
- Prisma client is type-safe for queries

**Frontend:**
- TypeScript `noEmit` mode only (Vite handles transpilation)
- React component props typed with interfaces
- API responses typed at service layer

---

*Convention analysis: 2026-03-19*
