'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPlayerAvailabilityForDate, getPlayers, type PlayerAvailability } from '@/lib/actions';
import { formatDateForStorage, getCurrentDayIndex, getTwoWeekWindow } from '@/lib/dateUtils';
import { SwiperContainer } from './SwiperContainer';
import { usePolling } from '@/hooks/usePolling';

export function PlannerClient() {
  const [dates] = useState(() => getTwoWeekWindow());
  const [currentDayIndex] = useState(() => getCurrentDayIndex(getTwoWeekWindow()));
  const [playerAvailabilityMap, setPlayerAvailabilityMap] = useState<Record<string, PlayerAvailability[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUserActive, setIsUserActive] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      const players = await getPlayers();
      const newMap: Record<string, PlayerAvailability[]> = {};

      for (const date of dates) {
        const dateString = formatDateForStorage(date);
        try {
          newMap[dateString] = await getPlayerAvailabilityForDate(dateString);
        } catch (error) {
          console.error(`Failed to load availability for ${dateString}:`, error);
          newMap[dateString] = players.map(player => ({
            player,
            availability: {}
          }));
        }
      }

      setPlayerAvailabilityMap(newMap);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  }, [dates]);

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Polling for real-time updates (disabled during active user editing)
  usePolling(loadAllData, {
    interval: 5000,
    enabled: !isLoading && !isUserActive
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-100 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading team planner...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Counter-Strike Team Planner
          </h1>
          <p className="text-gray-600">
            Plan your team&#39;s availability for the next 2 weeks
          </p>
        </div>

        <div className="h-[700px]">
          <SwiperContainer
            dates={dates}
            initialSlideIndex={currentDayIndex}
            playerAvailabilityMap={playerAvailabilityMap}
            onUpdate={loadAllData}
            onUserActivity={setIsUserActive}
          />
        </div>
      </div>
    </main>
  );
}
