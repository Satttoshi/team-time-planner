# Counter-Strike Team Planner App

## Project Overview
Build a real-time availability planner for a Counter-Strike team where 5-7 players/coaches can simultaneously enter their availability without overwriting each other's data.

## Architecture Decisions Made
- **Framework**: Next.js 15 (App Router) - Full-stack with API routes
- **Database**: Neon Postgres (already set up with DATABASE_URL in .env)
- **ORM**: Drizzle ORM (lightweight, type-safe)
- **Real-time Strategy**: Optimistic Updates with polling (no WebSocket complexity)
- **Authentication**: Simple app password stored in localStorage
- **UI Library**: Radix UI + Tailwind CSS
- **Calendar Navigation**: Swiper.js for day-by-day swiping

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

### Race Condition Prevention
- **NEVER** overwrite entire hours JSON object
- **ALWAYS** use atomic updates for single hours: `jsonb_set(hours, '{19}', '"ready"')`
- Each hour update is independent to prevent users overwriting each other

### Optimistic Updates Flow
1. User clicks status → UI updates immediately
2. API call happens in background
3. On success: replace temp data with server data
4. On error: rollback UI change and show error

### Data Fetching Strategy
- **Rolling 2-Week Window**: Always show next 14 days starting from Friday of current week
- **Dynamic Date Range**: When current week ends, automatically shift to next 2-week period
- **Limited Scope**: Prevents users from planning too far ahead, encourages regular updates
- Client-side caching of current 2-week window only
- Poll every 3 seconds for real-time updates within active window

## Key Features
- **Grid Layout**: Rows = time slots (19:00-22:00 default), Columns = players
- **Swiper Navigation**: Swipe between days within 2-week window
- **Smart Date Range**: Always shows next 2 weeks starting from Friday
- **Auto-Refresh Window**: Date range updates automatically when week ends
- **Dynamic Time Slots**: Add earlier hours (e.g., 17:00) when needed
- **Status Chips**: Visual status indicators with click-to-change
- **Simultaneous Editing**: Multiple users can edit without conflicts

## Essential Links
- [Drizzle ORM + Neon Setup](https://orm.drizzle.team/docs/get-started/neon-new)
- [Drizzle Queries](https://orm.drizzle.team/docs/crud)
- [Drizzle JSON Operations](https://orm.drizzle.team/docs/sql#sql-raw-queries)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Radix UI Components](https://www.radix-ui.com/primitives)
- [Swiper.js React](https://swiperjs.com/react)

## File Structure Priority
1. **Database Setup**: `drizzle.config.ts`, schema definition, migrations
2. **API Routes**: `/api/availability` (GET, PATCH), `/api/players` (GET, POST)
3. **Components**: Calendar grid, status chips, player columns
4. **Hooks**: `useOptimisticAvailability`, `usePolling`
5. **Main Page**: Swiper + grid integration

## Development Notes
- Database and environment already configured
- **IMPORTANT**: NEVER run npm scripts, types and compiling is being confirmed manually!!!
- All dependencies installed except Radix UI
- **Date Logic**: Calculate 2-week window starting from Friday of current week
- Focus on atomic updates and optimistic UI patterns
- Test with multiple browser tabs to simulate concurrent users

## Success Criteria
- Multiple users can edit simultaneously without data loss
- Instant UI feedback with optimistic updates
- Smooth day-to-day navigation within 2-week window
- Automatic date window progression (Friday-to-Friday cycles)
- Clean, intuitive grid interface for quick status changes
- Encourages regular team planning without overwhelming long-term views
