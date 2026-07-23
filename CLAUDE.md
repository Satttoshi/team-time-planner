# Counter-Strike Team Planner

Real-time availability planner for a CS team: players fill in per-hour availability on a 14-day grid with optimistic updates and background polling. A second feature, the **match planner**, provides collaborative Tiptap documents for planning FACEIT matches.

## Stack

Next.js 16 (App Router, server actions, `src/proxy.ts` for auth) · Neon Postgres + Drizzle ORM · Tailwind CSS 4 + Radix UI · Swiper.js · Temporal API (`temporal-polyfill`) · Vitest 4 + React Testing Library.

## Commands

- `npm run dev` — dev server
- `npm test` — full test suite (once)
- `npx vitest run <path>` — single test file
- `npm run test:coverage` — suite with coverage; fails below 70% thresholds
- `npm run lint` / `npm run format` / `npm run format:check`
- `npm run db:studio` — Drizzle Studio; schema lives in `src/lib/db/schema.ts`, migrations in `drizzle/`

## Definition of Done (MANDATORY)

Work is not finished until all of these pass:

1. `npm test` — full suite green
2. `npm run lint` — no errors
3. `npm run format:check` — clean (run `npm run format` to fix)

## Hard Rules

- **Design tokens only**: never use raw Tailwind colors (`text-green-600`, `bg-blue-500`). Use the tokens defined in `src/app/globals.css`: status (`status-ready`, `status-uncertain`, `status-unready`, `status-unknown`, each with `-bg` variant), surfaces (`background`, `surface`, `surface-elevated`), text (`foreground`, `foreground-secondary`, `foreground-muted`), borders (`border`, `border-elevated`), plus `primary` and `cs-*` accents. All tokens support light/dark via next-themes.
- **No `as` type assertions, no `any`** in TypeScript — details and alternatives in `.claude/rules/typescript.md` (auto-loaded when working on `.ts`/`.tsx` files).
- **Temporal API only** for date/time logic (`temporal-polyfill`); the `Date` API is deprecated in this codebase. Dates are stored as `YYYY-MM-DD` strings.
- **Atomic hour updates**: single-hour availability writes must use `jsonb_set` (see `updateAvailabilityStatus` in `src/lib/actions.ts`) so concurrent users never clobber each other's hours.
- **Server data never overwrites pending optimistic changes.** The update pipeline (`useGridState` → `useOptimisticUpdates` → `useUpdateQueue` → `usePolling`) batches clicks (~300ms), shows a sync ring on pending chips, and pauses polling during active editing (resumes ~2s after). Preserve these invariants when touching it.

## Domain Notes

- `availability.hours` is JSONB: `{ "19": "ready", "20": "uncertain" }`. Statuses: `ready | uncertain | unready | unknown`. Default slots 19:00–23:00; earlier hours can be added via the grid's + button.
- Players are managed in-app (`PlayerManagementSection`): they have `role` (player/coach), `sortOrder` (dnd-kit drag reordering), and `isActive`. Don't assume a fixed roster.
- Play-day detection (`findPlayDayOpportunities` in `src/lib/dateUtils.ts`): a viable block needs the **same** 5+ players (ready or uncertain) for 2+ consecutive hours.

## Auth

- Cookie-based password gate: `src/proxy.ts` redirects everything except `/auth`, `/api`, `/_next` to `/auth` unless the `auth-password` cookie matches `APP_PASSWORD`. No `APP_PASSWORD` set = open access (dev mode).
- `/api` routes are NOT covered by the proxy — they validate `APP_PASSWORD` themselves. Keep doing that for new routes.

## Match Planner

Collaborative match-planning documents at `/match-planner` (Tiptap editor, `match_documents` table). Gotchas:

- Concurrency uses a `version` counter (optimistic concurrency) and a `presence` JSONB map on the row — not websockets.
- Image uploads go to Vercel Blob via `/api/upload` + `/api/image` (needs `BLOB_READ_WRITE_TOKEN`).
- The editor UI (`src/components/match-planner/`) is excluded from unit-test coverage — jsdom can't exercise ProseMirror/contenteditable.

## Testing

- Config: `vitest.config.ts` (jsdom, `@` alias, coverage scope + 70% thresholds), `vitest.setup.ts` (jest-dom, `matchMedia`/`ResizeObserver` stubs for next-themes and dnd-kit).
- Tests are co-located: `src/lib/dateUtils.ts` → `src/lib/dateUtils.test.ts`.
- Shared helpers in `src/test-utils/`: `factories.ts` (player/availability builders), `mockDb.ts` (recording mock for Drizzle's fluent builder). Excluded from coverage.
- **Never touch a real database.** Mock with `vi.mock('@/lib/db', ...)` re-exporting the real schema plus a mocked `db` (pattern in `src/lib/actions.test.ts`). `src/lib/db/index.ts` throws without `DATABASE_URL` — never import it unmocked.
- Timer-based logic (batching/polling/activity): use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` (see hook tests).

### Rules for every change

1. After changing a source file, run its co-located test (`npx vitest run <test-file>`); run the full suite before declaring done.
2. New logic needs new tests; changed behavior needs updated tests. A change is incomplete while tests fail or new behavior is untested.
3. Coverage must stay above the 70% thresholds (currently ~90%) — verify with `npm run test:coverage` for non-trivial additions.
4. Test observable behavior and edge cases (business rules, error paths, races) — never tests that just re-assert mock wiring or chase line numbers.
5. Coverage exceptions only for code jsdom genuinely can't exercise: config-level excludes in `vitest.config.ts` or inline `/* v8 ignore start/stop */` blocks, always with a reason comment. Never add one to dodge a feasible test.
