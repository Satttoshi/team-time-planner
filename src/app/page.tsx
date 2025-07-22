import { PlannerClient } from '@/components/PlannerClient';
import { seedPlayersIfNeeded } from '@/lib/actions';

export default async function Home() {
  // Seed the database if needed
  await seedPlayersIfNeeded();
  
  return <PlannerClient />;
}
