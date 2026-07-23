# Counter-Strike Team Planner App

## Project Overview

Real-time availability planner for a Counter-Strike team where 5-7 players/coaches can simultaneously enter their availability with lightning-fast optimistic updates and zero conflicts.

## Architecture Decisions Made

- **Framework**: Next.js 16 (App Router) with server actions
- **Database**: Neon Postgres (configured in .env.local)
- **ORM**: Drizzle ORM (lightweight, type-safe)
- **Authentication**: Cookie-based password protection with proxy (Next.js 16, formerly middleware)
- **Real-time Strategy**: Smart optimistic updates + intelligent polling
- **UI Library**: Tailwind CSS + Radix UI utilities
- **Calendar Navigation**: Swiper.js for smooth day-to-day swiping
- **Date/Time API**: Temporal API (future-proof, replacing Date API)
- **Players**: Fixed set of 6 players (Mirko, Toby, Tom, Denis, Josh, Jannis)

## Database Schema

```typescript
// Two main tables:
// 1. players (id, name, createdAt)
// 2. availability (id, playerId, date, hours JSONB, updatedAt)

// hours JSONB structure: { "19": "ready", "20": "uncertain", "21": "unready" }
// Statuses: "ready", "uncertain", "unready", "unknown"
// Default time slots: 19:00-22:00, but any hour 0-23 can be added dynamically
// Early hours available: 16:00, 17:00, 18:00 (can be added via + button)
```

## Testing

- **Stack**: Vitest 4 + React Testing Library + jsdom, coverage via `@vitest/coverage-v8`
- **Config**: `vitest.config.ts` (aliases, environment, coverage scope + thresholds), `vitest.setup.ts` (jest-dom matchers, `matchMedia`/`ResizeObserver` stubs for next-themes and dnd-kit)
- **Commands**:
  - `npm test` — run the full suite once
  - `npm run test:watch` — watch mode during development
  - `npm run test:coverage` — full suite with coverage; FAILS if any threshold (70% statements/branches/functions/lines) is not met
  - `npx vitest run <path>` — run a single test file
- **Test location**: co-located with the source as `*.test.ts` / `*.test.tsx` (e.g. `src/lib/dateUtils.ts` → `src/lib/dateUtils.test.ts`)
- **Shared helpers**: `src/test-utils/` — `factories.ts` (player/availability builders) and `mockDb.ts` (recording mock for Drizzle's fluent query builder). Excluded from coverage.
- **Database**: tests NEVER touch a real database. Mock the db module with `vi.mock('@/lib/db', ...)` re-exporting the real schema plus a mocked `db` (see `src/lib/actions.test.ts` for the pattern). `src/lib/db/index.ts` throws without `DATABASE_URL`, so never import it unmocked in tests.
- **Timers**: batching/polling/activity logic is timer-based — use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` (see hook tests)

### Testing Rules for Every Change (MANDATORY)

1. **Run tests on touched files**: after changing any source file, run its co-located test file (`npx vitest run <test-file>`). Run the full `npm test` before declaring work finished.
2. **Create and adjust tests**: new logic/components require new tests; behavior changes require updating the affected tests. A change is not complete while tests fail or new behavior is untested.
3. **Keep coverage**: coverage must stay above the enforced 70% thresholds (currently ~90%). Verify with `npm run test:coverage` when adding non-trivial code.
4. **Write meaningful tests only**: test observable behavior and edge cases (business rules, error paths, race-condition handling) — never tests that merely re-assert mock wiring or chase line numbers.
5. **Coverage exceptions**: only for code that genuinely cannot be exercised in jsdom or unit tests:
   - Config-level excludes in `vitest.config.ts` (`coverage.exclude`): Next.js glue (`src/app/**`), tiptap match-planner editor UI, `SwiperContainer.tsx`, `src/lib/db/index.ts` — each with a reason comment
   - Inline `/* v8 ignore start */ ... /* v8 ignore stop */` for unreachable blocks inside otherwise-tested files (e.g. dnd-kit drag handlers in `PlayerOrderSection.tsx`) — always with a `--` reason
   - Never add an exception to dodge writing a feasible test

## Critical Technical Requirements

### Design System & Styling

- **Design Tokens Only**: NEVER use raw Tailwind colors (e.g., `text-green-600`, `bg-blue-500`)
- **Custom CSS Variables**: Use only design tokens defined in `globals.css` (e.g., `text-status-ready`, `bg-surface-elevated`)
- **Theme Support**: All colors automatically support light/dark mode via CSS custom properties
- **Status Colors**: Use semantic status tokens: `status-ready`, `status-uncertain`, `status-unready`, `status-unknown`
- **Surface Colors**: Use surface hierarchy: `background`, `surface`, `surface-elevated`
- **Text Colors**: Use text hierarchy: `foreground`, `foreground-secondary`, `foreground-muted`
- **Border Colors**: Use border tokens: `border`, `border-elevated`
- **Consistent Implementation**: Always check `globals.css` for available design tokens before styling

### Lightning-Fast UX Design

- **Instant Response**: Status changes happen immediately on click (no waiting)
- **Rapid Fire Clicking**: Users can click through entire days instantly
- **Queue System**: Multiple rapid clicks are batched and processed efficiently
- **Smart Polling**: Automatic polling pauses during active user editing
- **Visual Feedback**: Subtle blue ring on chips being synced (non-intrusive)

### Race Condition Prevention

- **Atomic Updates**: Using `jsonb_set(hours, '{19}', '"ready"')` for single-hour updates
- **Optimistic Persistence**: UI changes persist until server confirms
- **Update Batching**: 300ms delay allows rapid clicking, then batches updates
- **Conflict Resolution**: Server data never overwrites pending user changes

### Advanced Optimistic Updates Flow

1. **Instant UI**: User clicks status → immediate visual change
2. **Activity Detection**: System detects active editing, pauses polling
3. **Update Queue**: Changes queued for batch processing after brief pause
4. **Background Sync**: Database updates happen without blocking UI
5. **Smart Recovery**: Failed updates retry automatically
6. **Polling Resume**: Real-time sync resumes 2s after user stops editing

### Data Fetching Strategy

- **Smart 2-Week Window**: Monday-Thursday shows current+next week, Friday-Sunday shows current weekend+next 2 weeks
- **Current Day Always Included**: Date range logic ensures today is always visible and accessible
- **Smart Polling**: 3-second intervals, disabled during active editing
- **Client-Side Caching**: Full 2-week window loaded on startup
- **Activity-Aware**: Polling intelligently pauses/resumes based on user activity

## Key Features Implemented

### 🎯 **Grid Interface**

- **Perfect Grid Layout**: CSS Grid with time slots (rows) × players (columns)
- **Dynamic Time Addition**: "+" button adds 18:00, 17:00, 16:00 slots on demand
- **Status Cycling**: Click chips to cycle through Ready → Maybe → No → Unknown
- **Color-Coded Statuses**: Green (ready), Yellow (uncertain), Red (unready), Gray (unknown)

### 🚀 **Navigation & UX**

- **Swiper Integration**: Smooth horizontal swiping between 14 days
- **Today Highlighting**: Current day has blue styling and "Today" badge
- **Card Headers**: Each day shows formatted date (e.g., "Friday, Jul 22")
- **Responsive Design**: Touch-friendly on mobile, keyboard navigation support

### ⚡ **Performance Optimizations**

- **Instant Feedback**: Zero latency on status changes
- **Batch Processing**: Updates queued and sent in batches
- **Smart Caching**: Client-side 2-week window cache
- **Activity Detection**: Polling pauses during rapid editing
- **Visual Sync State**: Blue rings show pending database updates

### 🎮 **Play Day Detection**

- **Smart Analysis**: Automatically detects when 5+ players are available for 2+ consecutive hours
- **Same Team Requirement**: Ensures the SAME 5+ players are available for the entire duration
- **Multiple Opportunities**: Shows all valid practice windows on the same day
- **Optimal Blocks**: Displays longest consecutive periods, not overlapping ranges
- **Visual Integration**: Prominent headings below availability grid in each DayCard
- **Status Flexibility**: Counts both "ready" and "maybe" players as available

## Essential Links

- [Drizzle ORM + Neon Setup](https://orm.drizzle.team/docs/get-started/neon-new)
- [Drizzle Queries](https://orm.drizzle.team/docs/crud)
- [Drizzle JSON Operations](https://orm.drizzle.team/docs/sql#sql-raw-queries)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Radix UI Components](https://www.radix-ui.com/primitives)
- [Swiper.js React](https://swiperjs.com/react)
- [Temporal API Documentation](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Temporal)
- [Temporal PlainDate Methods](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate)
- [Temporal Calendar Operations](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate/add)

## Current File Structure

```
src/
├── app/
│   ├── auth/
│   │   └── page.tsx             # Password authentication form
│   ├── layout.tsx               # Root layout with metadata
│   └── page.tsx                 # Server component (seeding + client wrapper)
├── components/
│   ├── PlannerClient.tsx        # Main client component with polling logic
│   ├── SwiperContainer.tsx      # Swiper wrapper for 14-day navigation
│   ├── DayCard.tsx              # Individual day card with header
│   ├── AvailabilityGrid.tsx     # Grid with optimistic updates & batching
│   └── StatusChip.tsx           # Clickable status indicators
├── hooks/
│   └── usePolling.ts            # Smart polling hook with activity detection
├── lib/
│   ├── actions.ts               # Server actions for database operations
│   ├── auth-actions.ts          # Authentication server actions
│   ├── dateUtils.ts             # 2-week window calculation utilities (Temporal API)
│   └── db/
│       ├── index.ts             # Drizzle database connection
│       └── schema.ts            # Database schema definitions
├── proxy.ts                     # Authentication proxy (Next.js 16) with cookie validation
drizzle.config.ts                # Drizzle kit configuration
```

## Technical Implementation Details

### Server Actions (lib/actions.ts)

- `seedPlayersIfNeeded()`: Auto-seeds 6 default players
- `getPlayerAvailabilityForDate()`: Loads availability for specific date
- `getAllPlayerAvailabilityForDates()`: Loads availability for multiple dates efficiently
- `updateAvailabilityStatus()`: Atomic single-hour updates with existence check

### Authentication System (lib/auth-actions.ts + proxy.ts)

- **Environment Variables**: `APP_PASSWORD` (required), `AUTH_SECRET` (optional)
- **Cookie-Based Auth**: Persistent 1-year cookie `auth-password` stores validated password
- **Proxy Protection**: All routes except `/auth`, `/api`, `/_next` require valid cookie
- **One-Time Password**: Enter `APP_PASSWORD` once, cookie persists until manually cleared
- **Server Validation**: Password validation happens server-side for security
- **Browser Extension Safe**: Uses `data-1p-ignore` and `autoComplete="off"` to prevent conflicts

### Date Logic (lib/dateUtils.ts) - Using Temporal API

- `getTwoWeekWindow()`: Smart 2-week range that always includes current day
- `getStartOfWeek()`: Monday-based week start calculation
- `getCurrentDayIndex()`: Finds today's position within the date range
- `findPlayDayOpportunities()`: Detects consecutive time blocks where 5+ same players are available
- **IMPORTANT**: Always use Temporal API for date operations (Date API is deprecated)

### Optimistic Updates (components/AvailabilityGrid.tsx)

- **Update Queue**: `Map<string, UpdateData>` for batching changes
- **Pending State**: Visual blue rings on syncing chips
- **Activity Detection**: 2-second timeout for polling pause
- **Batch Delay**: 300ms allows rapid clicking before server sync

### Smart Polling (hooks/usePolling.ts)

- **Activity-Aware**: Automatically pauses during user editing
- **Configurable**: 3-second intervals when active (default)
- **Error Handling**: Continues polling despite individual failures

## Current Status: ✅ COMPLETE

- ✅ Lightning-fast optimistic updates
- ✅ Multi-user simultaneous editing without conflicts
- ✅ Smart polling that pauses during active use
- ✅ Smooth swiper navigation between 14 days
- ✅ Dynamic time slot addition (+ button functionality)
- ✅ Visual feedback for sync state
- ✅ Atomic database operations
- ✅ Auto-seeded player data
- ✅ Mobile-responsive design
- ✅ Cookie-based authentication with persistent login
- ✅ Proxy protection for all routes
- ✅ Play day detection with optimal time block analysis

## Success Criteria: ✅ ACHIEVED

- ✅ Multiple users can edit simultaneously without data loss
- ✅ **Lightning-fast UI**: Instant response to rapid clicking
- ✅ Smooth day-to-day navigation within 2-week window
- ✅ **Perfect UX**: Can rapidly fill entire day's availability
- ✅ Clean, intuitive grid interface for quick status changes
- ✅ **Smart Syncing**: Background updates don't interfere with editing
- ✅ **Secure Access**: Password protection with persistent authentication
- ✅ **Intelligent Scheduling**: Automatic detection of viable team practice sessions
