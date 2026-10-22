import { PlannerClient } from '@/components/PlannerClient';
import { seedPlayersIfNeeded } from '@/lib/actions';

// Render per request: a statically prerendered page would seed only at build
// time. Availability is loaded on the client (in the viewer's timezone) while
// PlannerClient shows a spinner.
export const dynamic = 'force-dynamic';

export default async function Home() {
  await seedPlayersIfNeeded();

  return <PlannerClient />;
}
