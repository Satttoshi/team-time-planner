'use client';

import { useCallback, useState } from 'react';
import {
  getAllPlayerAvailabilityForDates,
  getPlayers,
  type PlayerAvailability,
} from '@/lib/actions';
import {
  formatDateForStorage,
  getCurrentDayIndex,
  getTwoWeekWindow,
} from '@/lib/dateUtils';
import { SwiperContainer } from './SwiperContainer';
import { PlannerFooter } from './PlannerFooter';
import { usePolling } from '@/hooks/usePolling';

export function PlannerClient() {
  const [dates] = useState(() => getTwoWeekWindow());
  const [currentDayIndex] = useState(() =>
    getCurrentDayIndex(getTwoWeekWindow())
  );
  // null until the first client-side load resolves; the grid stays hidden
  // behind a spinner so no empty or stale table flashes on boot
  const [playerAvailabilityMap, setPlayerAvailabilityMap] = useState<Record<
    string,
    PlayerAvailability[]
  > | null>(null);
  const [isUserActive, setIsUserActive] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      const dateStrings = dates.map(date => formatDateForStorage(date));
      const newMap = await getAllPlayerAvailabilityForDates(dateStrings);

      setPlayerAvailabilityMap(newMap);
    } catch (error) {
      console.error('Failed to load data:', error);

      // Fallback: create empty availability for all players
      try {
        const players = await getPlayers(true); // Only active players for schedule grid
        const fallbackMap: Record<string, PlayerAvailability[]> = {};

        for (const date of dates) {
          const dateString = formatDateForStorage(date);
          fallbackMap[dateString] = players.map(player => ({
            player,
            availability: {},
          }));
        }

        setPlayerAvailabilityMap(fallbackMap);
      } catch (fallbackError) {
        console.error('Failed to create fallback data:', fallbackError);
      }
    }
  }, [dates]);

  // Polling for real-time updates (disabled during active user editing)
  usePolling(loadAllData, {
    interval: 5000,
    enabled: !isUserActive,
  });

  return (
    <main className="min-h-screen pb-14">
      <div className="container mx-auto h-[700px]">
        {playerAvailabilityMap ? (
          <SwiperContainer
            dates={dates}
            initialSlideIndex={currentDayIndex}
            playerAvailabilityMap={playerAvailabilityMap}
            onUpdate={loadAllData}
            onUserActivity={setIsUserActive}
            onPlayersReordered={loadAllData}
          />
        ) : (
          <div
            role="status"
            aria-label="Loading availability"
            className="flex h-full items-center justify-center"
          >
            <div className="text-foreground-muted h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        )}
      </div>
      <PlannerFooter />
    </main>
  );
}
