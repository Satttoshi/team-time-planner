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
import { usePolling } from '@/hooks/usePolling';

interface PlannerClientProps {
  initialData: Record<string, PlayerAvailability[]>;
}

export function PlannerClient({ initialData }: PlannerClientProps) {
  const [dates] = useState(() => getTwoWeekWindow());
  const [currentDayIndex] = useState(() =>
    getCurrentDayIndex(getTwoWeekWindow())
  );
  const [playerAvailabilityMap, setPlayerAvailabilityMap] =
    useState<Record<string, PlayerAvailability[]>>(initialData);
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
        const players = await getPlayers();
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
    <main className="min-h-screen bg-gray-950">
      <div className="container mx-auto h-[700px]">
        <SwiperContainer
          dates={dates}
          initialSlideIndex={currentDayIndex}
          playerAvailabilityMap={playerAvailabilityMap}
          onUpdate={loadAllData}
          onUserActivity={setIsUserActive}
        />
      </div>
    </main>
  );
}
