'use client';

import { useState, useEffect } from 'react';
import { type AvailabilityStatus } from '@/lib/db/schema';
import { type PlayerAvailability } from '@/lib/actions';

export interface UseOptimisticUpdatesOptions {
  playerAvailabilities: PlayerAvailability[];
  pendingUpdates: Set<string>;
  bulkPendingPlayers: Set<number>;
  hasHandledDelete: boolean;
  userActiveRef: { current: boolean };
  onUserActivity?: (isActive: boolean) => void;
  activityTimeoutRef: { current: NodeJS.Timeout | null };
  updateQueueRef: {
    current: Map<
      string,
      {
        playerId: number;
        date: string;
        hour: string;
        status: AvailabilityStatus;
      }
    >;
  };
  bulkUpdateQueueRef: {
    current: Map<
      number,
      {
        playerId: number;
        date: string;
        hours: string[];
        status: AvailabilityStatus;
      }
    >;
  };
}

export function useOptimisticUpdates({
  playerAvailabilities,
  pendingUpdates,
  bulkPendingPlayers,
  hasHandledDelete,
  userActiveRef,
  onUserActivity,
  activityTimeoutRef,
  updateQueueRef,
  bulkUpdateQueueRef,
}: UseOptimisticUpdatesOptions) {
  const [optimisticData, setOptimisticData] = useState<
    Record<string, AvailabilityStatus>
  >({});
  const [internalHasHandledDelete, setHasHandledDelete] =
    useState(hasHandledDelete);

  // Clear optimistic data when server data matches user's intended changes
  useEffect(() => {
    const keysToRemove: string[] = [];

    Object.keys(optimisticData).forEach(key => {
      const [playerIdStr, hour] = key.split('-');
      const playerId = parseInt(playerIdStr);
      const optimisticStatus = optimisticData[key];

      // Find the server data for this player/hour combination
      const playerData = playerAvailabilities.find(
        pa => pa.player.id === playerId
      );
      const serverStatus = playerData?.availability[hour];

      // If server data matches optimistic data and the update is no longer pending, clear optimistic
      if (serverStatus === optimisticStatus && !pendingUpdates.has(key)) {
        keysToRemove.push(key);
      }
    });

    if (keysToRemove.length > 0) {
      setOptimisticData(prev => {
        const updated = { ...prev };
        keysToRemove.forEach(key => delete updated[key]);
        return updated;
      });
    }
  }, [playerAvailabilities, optimisticData, pendingUpdates]);

  // Clear all optimistic data and pending updates when day data is deleted
  useEffect(() => {
    const hasAnyData = playerAvailabilities.some(
      pa => Object.keys(pa.availability).length > 0
    );
    const hasOptimisticData =
      Object.keys(optimisticData).length > 0 ||
      pendingUpdates.size > 0 ||
      bulkPendingPlayers.size > 0;

    // Only clear optimistic data if:
    // 1. There's no server data
    // 2. We haven't handled the delete yet
    // 3. We have optimistic data to clear
    // 4. User is NOT currently actively editing (prevent clearing during new edits)
    if (
      !hasAnyData &&
      !internalHasHandledDelete &&
      hasOptimisticData &&
      !userActiveRef.current
    ) {
      setOptimisticData({});
      updateQueueRef.current.clear();
      bulkUpdateQueueRef.current.clear();

      // Clear any pending activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }

      // Signal that the user is no longer active
      onUserActivity?.(false);

      // Mark that we've handled to delete
      setHasHandledDelete(true);
    }

    // Reset the delete handling flag only when we get actual server data back
    if (hasAnyData) {
      setHasHandledDelete(false);
    }
  }, [
    playerAvailabilities,
    optimisticData,
    pendingUpdates,
    bulkPendingPlayers,
    onUserActivity,
    internalHasHandledDelete,
    userActiveRef,
    activityTimeoutRef,
    updateQueueRef,
    bulkUpdateQueueRef,
  ]);

  const applyOptimisticUpdate = (key: string, status: AvailabilityStatus) => {
    setOptimisticData(prev => ({
      ...prev,
      [key]: status,
    }));
  };

  const applyBulkOptimisticUpdate = (
    playerId: number,
    hours: string[],
    status: AvailabilityStatus
  ) => {
    hours.forEach(hour => {
      const key = `${playerId}-${hour}`;
      setOptimisticData(prev => ({
        ...prev,
        [key]: status,
      }));
    });
  };

  return {
    optimisticData,
    hasHandledDelete: internalHasHandledDelete,
    applyOptimisticUpdate,
    applyBulkOptimisticUpdate,
  };
}
