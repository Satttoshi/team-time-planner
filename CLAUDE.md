# Counter-Strike Team Planner App

## Project Overview

Real-time availability planner for a Counter-Strike team where 5-7 players/coaches can simultaneously enter their availability with lightning-fast optimistic updates and zero conflicts.

## Architecture Decisions Made

- **Framework**: Next.js 15 (App Router) with server actions
- **Database**: Neon Postgres (configured in .env.local)
- **ORM**: Drizzle ORM (lightweight, type-safe)
- **Real-time Strategy**: Smart optimistic updates + intelligent polling
- **UI Library**: Tailwind CSS + Radix UI utilities
- **Calendar Navigation**: Swiper.js for smooth day-to-day swiping
- **Players**: Fixed set of 6 players (Mirko, Toby, Tom, Denis, Josh, Jannis)

## Database Schema

```typescript
// Two main tables:
// 1. players (id, name, createdAt)
// 2. availability (id, playerId, date, hours JSON, updatedAt)

// hours JSON structure: { "19": "ready", "20": "uncertain", "21": "unready" }
// Statuses: "ready", "uncertain", "unready", "unknown"
// Default time slots: 19:00-22:00, but any hour 0-23 can be added dynamically
```

## Critical Technical Requirements

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

- **Rolling 2-Week Window**: Always show next 14 days starting from Friday
- **Smart Polling**: 5-second intervals, disabled during active editing
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

## Essential Links

- [Drizzle ORM + Neon Setup](https://orm.drizzle.team/docs/get-started/neon-new)
- [Drizzle Queries](https://orm.drizzle.team/docs/crud)
- [Drizzle JSON Operations](https://orm.drizzle.team/docs/sql#sql-raw-queries)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Radix UI Components](https://www.radix-ui.com/primitives)
- [Swiper.js React](https://swiperjs.com/react)

## Current File Structure

```
src/
├── app/
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
│   ├── dateUtils.ts             # 2-week window calculation utilities
│   └── db/
│       ├── index.ts             # Drizzle database connection
│       └── schema.ts            # Database schema definitions
```

## Technical Implementation Details

### Server Actions (lib/actions.ts)

- `seedPlayersIfNeeded()`: Auto-seeds 6 default players
- `getPlayerAvailabilityForDate()`: Loads availability for specific date
- `updateAvailabilityStatus()`: Atomic single-hour updates with existence check

### Optimistic Updates (components/AvailabilityGrid.tsx)

- **Update Queue**: `Map<string, UpdateData>` for batching changes
- **Pending State**: Visual blue rings on syncing chips
- **Activity Detection**: 2-second timeout for polling pause
- **Batch Delay**: 300ms allows rapid clicking before server sync

### Smart Polling (hooks/usePolling.ts)

- **Activity-Aware**: Automatically pauses during user editing
- **Configurable**: 5-second intervals when active
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

## Success Criteria: ✅ ACHIEVED

- ✅ Multiple users can edit simultaneously without data loss
- ✅ **Lightning-fast UI**: Instant response to rapid clicking
- ✅ Smooth day-to-day navigation within 2-week window
- ✅ **Perfect UX**: Can rapidly fill entire day's availability
- ✅ Clean, intuitive grid interface for quick status changes
- ✅ **Smart Syncing**: Background updates don't interfere with editing
