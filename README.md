# Team Time Planner

Real-time availability planner for a Counter-Strike team. Players fill in per-hour availability on a rolling 14-day grid — with optimistic updates and background polling, so the whole team can edit at once without stepping on each other. A built-in **match planner** adds collaborative documents for planning FACEIT matches.

## Stack

Next.js 16 (App Router, server actions) · React 19 · Neon Postgres + Drizzle ORM · Tailwind CSS 4 + Radix UI · Tiptap · Swiper.js · Temporal API (`temporal-polyfill`) · Vitest 4 + React Testing Library

## Getting Started

Requires Node.js 24+ and a [Neon](https://neon.tech) Postgres database.

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable                | Required        | Purpose                                                  |
| ----------------------- | --------------- | -------------------------------------------------------- |
| `DATABASE_URL`          | yes             | Neon Postgres connection string                          |
| `APP_PASSWORD`          | no (dev)        | Password gate for the whole app; unset = open access     |
| `AUTH_SECRET`           | no              | Optional secret for auth hardening                       |
| `BLOB_READ_WRITE_TOKEN` | for match plans | Vercel Blob token for image uploads in the match planner |

### Database

The Drizzle schema lives in `src/lib/db/schema.ts`, generated migrations in `drizzle/`.

```bash
npx drizzle-kit generate   # generate a migration after schema changes
npx drizzle-kit migrate    # apply migrations
npm run db:studio          # browse the DB with Drizzle Studio
```

## Scripts

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Dev server                                       |
| `npm run build`         | Production build                                 |
| `npm test`              | Run the test suite once                          |
| `npm run test:watch`    | Tests in watch mode                              |
| `npm run test:coverage` | Tests with coverage (fails below 70% thresholds) |
| `npm run lint`          | ESLint                                           |
| `npm run format`        | Prettier (write) / `format:check` to verify      |
| `npm run db:studio`     | Drizzle Studio                                   |

## Deployment

Built for [Vercel](https://vercel.com) + [Neon](https://neon.tech):

1. Import the repo into Vercel.
2. Set `DATABASE_URL`, `APP_PASSWORD`, and `AUTH_SECRET` in the project's environment variables.
3. For the match planner's image uploads, attach a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`.

## Architecture Notes

- **Availability model** — one row per player per day; `availability.hours` is JSONB (`{ "19": "ready", "20": "uncertain" }`). Single-hour writes use `jsonb_set` so concurrent updates to different hours never clobber each other.
- **Optimistic update pipeline** — `useGridState` → `useOptimisticUpdates` → `useUpdateQueue` → `usePolling`. Clicks are batched (~300ms), pending chips show a sync ring, and polling pauses during active editing (resumes ~2s after). Server data never overwrites pending optimistic changes.
- **Dates & time** — all date/time logic uses the Temporal API (`temporal-polyfill`); dates are stored as `YYYY-MM-DD` strings. The `Date` API is considered deprecated in this codebase.
- **Auth** — a cookie-based password gate in `src/proxy.ts` redirects everything except `/auth`, `/api`, and `/_next` to `/auth` unless the `auth-password` cookie matches `APP_PASSWORD`. `/api` routes validate the password themselves.
- **Match planner concurrency** — a `version` counter (optimistic concurrency) plus a `presence` JSONB map on the document row; no websockets involved.
- **Styling** — design tokens only (defined in `src/app/globals.css`): status colors, surfaces, text, and border tokens with light/dark support via next-themes. Raw Tailwind colors are not used.

## Testing & Contributing

```bash
npm test                      # full suite
npx vitest run <path>         # single test file
npm run test:coverage         # coverage report (70% minimum thresholds)
```

- Tests are co-located with their source (`src/lib/dateUtils.ts` → `src/lib/dateUtils.test.ts`); shared factories and a Drizzle mock live in `src/test-utils/`.
- Tests never touch a real database — `@/lib/db` is mocked (see `src/lib/actions.test.ts` for the pattern).
- Timer-based logic (batching, polling) is tested with Vitest fake timers.
- The Tiptap editor UI is excluded from coverage — jsdom can't exercise ProseMirror/contenteditable.

**Definition of done** for any change: `npm test`, `npm run lint`, and `npm run format:check` all pass, and new or changed behavior is covered by tests.
