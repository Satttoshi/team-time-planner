'use client';

import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';
import { useUpdateQueue } from '@/hooks/useUpdateQueue';
import { useGridState } from '@/hooks/useGridState';
import { getAllHours, getBulkStatus } from '@/lib/gridUtils';
import { getNextStatus } from '../StatusChip';
import { GridHeader } from './GridHeader';
import { TimeSlotRow } from './TimeSlotRow';
import { type PlayerAvailability } from '@/lib/actions';
import { type AvailabilityStatus } from '@/lib/db/schema';

interface AvailabilityGridProps {
  date: string;
  playerAvailabilities: PlayerAvailability[];
  onUpdate?: () => void;
  onUserActivity?: (isActive: boolean) => void;
}

export function AvailabilityGrid({
  date,
  playerAvailabilities,
  onUserActivity,
}: AvailabilityGridProps) {
  // Initialize grid state
  const {
    additionalHours,
    pendingUpdates,
    setPendingUpdates,
    bulkPendingPlayers,
    setBulkPendingPlayers,
    userActiveRef,
    activityTimeoutRef,
    handleAddEarlyHour,
    setUserActive,
    canAddEarlyHour,
  } = useGridState({ onUserActivity });

  // Initialize update queue
  const {
    updateQueueRef,
    bulkUpdateQueueRef,
    queueUpdate,
    queueBulkUpdate,
  } = useUpdateQueue({
    onPendingUpdatesChange: setPendingUpdates,
    onBulkPendingPlayersChange: setBulkPendingPlayers,
  });

  // Get all hours that have any data
  const allHours = getAllHours(additionalHours, playerAvailabilities);

  // Initialize optimistic updates
  const {
    optimisticData,
    applyOptimisticUpdate,
    applyBulkOptimisticUpdate,
  } = useOptimisticUpdates({
    playerAvailabilities,
    pendingUpdates,
    bulkPendingPlayers,
    hasHandledDelete: false,
    userActiveRef,
    onUserActivity,
    activityTimeoutRef,
    updateQueueRef,
    bulkUpdateQueueRef,
  });

  const handleStatusChange = (
    playerId: number,
    hour: string,
    currentStatus: AvailabilityStatus
  ) => {
    const newStatus = getNextStatus(currentStatus);
    const key = `${playerId}-${hour}`;

    // Mark user as actively editing
    setUserActive(true);

    // Apply optimistic update
    applyOptimisticUpdate(key, newStatus);

    // Queue the server update
    queueUpdate(playerId, date, hour, newStatus);
  };

  const handleBulkStatusChange = (playerId: number) => {
    const currentBulkStatus = getBulkStatus(playerId, allHours, optimisticData, playerAvailabilities);
    const newStatus = getNextStatus(currentBulkStatus);

    // Mark user as actively editing
    setUserActive(true);

    // Apply bulk optimistic update
    applyBulkOptimisticUpdate(playerId, allHours, newStatus);

    // Queue the bulk server update
    queueBulkUpdate(playerId, date, allHours, newStatus);
  };

  const handleAddEarlyHourClick = () => {
    handleAddEarlyHour(allHours);
  };

  return (
    <div className="flex justify-center">
      <div
        className="mt-2 grid max-w-[450px] flex-1 gap-1 pr-1"
        style={{
          gridTemplateColumns: `repeat(${playerAvailabilities.length + 1}, 1fr)`,
          gridTemplateRows: `28px repeat(${allHours.length}, 32px)`,
        }}
      >
        {/* Header row */}
        <GridHeader
          playerAvailabilities={playerAvailabilities}
          allHours={allHours}
          optimisticData={optimisticData}
          bulkPendingPlayers={bulkPendingPlayers}
          canAddEarlyHour={canAddEarlyHour(allHours)}
          onAddEarlyHour={handleAddEarlyHourClick}
          onBulkStatusChange={handleBulkStatusChange}
        />

        {/* Time slots rows */}
        {allHours.map(hour => (
          <TimeSlotRow
            key={hour}
            hour={hour}
            playerAvailabilities={playerAvailabilities}
            optimisticData={optimisticData}
            pendingUpdates={pendingUpdates}
            bulkPendingPlayers={bulkPendingPlayers}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </div>
  );
}