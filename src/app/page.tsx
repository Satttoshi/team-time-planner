import { PlannerClient } from '@/components/PlannerClient';
import {
  seedPlayersIfNeeded,
  getAllPlayerAvailabilityForDates,
} from '@/lib/actions';
import { getTwoWeekWindow, formatDateForStorage } from '@/lib/dateUtils';

export default async function Home() {
  // Seed the database if needed
  await seedPlayersIfNeeded();

  // Load initial data on server
  const dates = getTwoWeekWindow();
  const dateStrings = dates.map(date => formatDateForStorage(date));
  const initialData = await getAllPlayerAvailabilityForDates(dateStrings);

  return <PlannerClient initialData={initialData} />;
}
