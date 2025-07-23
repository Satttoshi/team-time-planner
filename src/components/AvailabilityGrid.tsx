'use client';

import { useState, useRef, useEffect } from 'react';
import { PlusIcon } from '@radix-ui/react-icons';
import { StatusChip, getNextStatus } from './StatusChip';
import {
  updateAvailabilityStatus,
  updateBulkAvailabilityStatus,
  type PlayerAvailability,
} from '@/lib/actions';
import { type AvailabilityStatus } from '@/lib/db/schema';
import { clsx } from 'clsx';

interface AvailabilityGridProps {
  date: string;
  playerAvailabilities: PlayerAvailability[];
  onUpdate?: () => void;
  onUserActivity?: (isActive: boolean) => void;
}

const DEFAULT_HOURS = ['19', '20', '21', '22', '23'];
const AVAILABLE_EARLY_HOURS = [
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
];

export function AvailabilityGrid({
  date,
  playerAvailabilities,
  onUserActivity,
}: AvailabilityGridProps) {
  const [optimisticData, setOptimisticData] = useState<
    Record<string, AvailabilityStatus>
  >({});
  const [additionalHours, setAdditionalHours] = useState<string[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [bulkPendingPlayers, setBulkPendingPlayers] = useState<Set<number>>(
    new Set()
  );

  const updateQueueRef = useRef<
    Map<
      string,
      {
        playerId: number;
        date: string;
        hour: string;
        status: AvailabilityStatus;
      }
    >
  >(new Map());
  const bulkUpdateQueueRef = useRef<
    Map<
      number,
      {
        playerId: number;
        date: string;
        hours: string[];
        status: AvailabilityStatus;
      }
    >
  >(new Map());
  const isProcessingRef = useRef(false);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const hasAnyData = playerAvailabilities.some(pa => 
      Object.keys(pa.availability).length > 0
    );
    
    // If there's no server data but we have optimistic data, it means the day was deleted
    if (!hasAnyData && (Object.keys(optimisticData).length > 0 || pendingUpdates.size > 0 || bulkPendingPlayers.size > 0)) {
      setOptimisticData({});
      setPendingUpdates(new Set());
      setBulkPendingPlayers(new Set());
      updateQueueRef.current.clear();
      bulkUpdateQueueRef.current.clear();
      
      // Reset additional hours to empty since the day was cleared
      setAdditionalHours([]);
      
      // Clear any pending activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
      
      // Signal that user is no longer active
      onUserActivity?.(false);
    }
  }, [playerAvailabilities, optimisticData, pendingUpdates, bulkPendingPlayers, onUserActivity]);

  // Get all hours that have any data, ensuring we include default hours and additional hours
  const allHours = Array.from(
    new Set([
      ...additionalHours,
      ...DEFAULT_HOURS,
      ...playerAvailabilities.flatMap(pa => Object.keys(pa.availability)),
    ])
  ).sort((a, b) => parseInt(a) - parseInt(b));

  // Get current bulk status for a player (most common status across all hours)
  const getBulkStatus = (playerId: number): AvailabilityStatus => {
    const statusCounts: Record<AvailabilityStatus, number> = {
      ready: 0,
      uncertain: 0,
      unready: 0,
      unknown: 0,
    };

    allHours.forEach(hour => {
      const status = getStatus(playerId, hour);
      statusCounts[status]++;
    });

    // Return the most frequent status, with unknown as default
    let maxCount = 0;
    let mostFrequentStatus: AvailabilityStatus = 'unknown';

    (Object.entries(statusCounts) as [AvailabilityStatus, number][]).forEach(
      ([status, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostFrequentStatus = status;
        }
      }
    );

    return mostFrequentStatus;
  };

  // Process queued updates in batches
  const processUpdateQueue = async () => {
    if (
      isProcessingRef.current ||
      (updateQueueRef.current.size === 0 &&
        bulkUpdateQueueRef.current.size === 0)
    ) {
      return;
    }

    isProcessingRef.current = true;

    // Process individual updates
    const updates = Array.from(updateQueueRef.current.values());
    updateQueueRef.current.clear();

    // Process bulk updates
    const bulkUpdates = Array.from(bulkUpdateQueueRef.current.values());
    bulkUpdateQueueRef.current.clear();

    // Process individual updates
    const individualPromises = updates.map(
      async ({ playerId, date, hour, status }) => {
        const key = `${playerId}-${hour}`;
        try {
          await updateAvailabilityStatus(playerId, date, hour, status);
          // Remove from pending updates on success
          setPendingUpdates(prev => {
            const updated = new Set(prev);
            updated.delete(key);
            return updated;
          });
        } catch (error) {
          console.error('Failed to update availability:', error);
        }
      }
    );

    // Process bulk updates
    const bulkPromises = bulkUpdates.map(
      async ({ playerId, date, hours, status }) => {
        try {
          await updateBulkAvailabilityStatus(playerId, date, hours, status);
          // Remove from bulk pending players on success
          setBulkPendingPlayers(prev => {
            const updated = new Set(prev);
            updated.delete(playerId);
            return updated;
          });
          // Remove individual pending updates for all hours affected
          setPendingUpdates(prev => {
            const updated = new Set(prev);
            hours.forEach(hour => {
              updated.delete(`${playerId}-${hour}`);
            });
            return updated;
          });
        } catch (error) {
          console.error('Failed to update bulk availability:', error);
        }
      }
    );

    await Promise.allSettled([...individualPromises, ...bulkPromises]);
    isProcessingRef.current = false;

    // Process any new updates that came in while we were processing
    if (
      updateQueueRef.current.size > 0 ||
      bulkUpdateQueueRef.current.size > 0
    ) {
      setTimeout(processUpdateQueue, 100);
    }
  };

  const handleStatusChange = (
    playerId: number,
    hour: string,
    currentStatus: AvailabilityStatus
  ) => {
    const newStatus = getNextStatus(currentStatus);
    const key = `${playerId}-${hour}`;

    // Immediate optimistic update
    setOptimisticData(prev => ({
      ...prev,
      [key]: newStatus,
    }));

    // Add to pending updates
    setPendingUpdates(prev => new Set([...prev, key]));

    // Queue the server update
    updateQueueRef.current.set(key, {
      playerId,
      date,
      hour,
      status: newStatus,
    });

    // Signal user activity
    onUserActivity?.(true);

    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      onUserActivity?.(false);
    }, 2000);

    // Process updates after a short delay to allow for rapid clicking
    setTimeout(processUpdateQueue, 300);
  };

  const handleBulkStatusChange = (playerId: number) => {
    const currentBulkStatus = getBulkStatus(playerId);
    const newStatus = getNextStatus(currentBulkStatus);

    // Update all hours for this player optimistically
    allHours.forEach(hour => {
      const key = `${playerId}-${hour}`;
      setOptimisticData(prev => ({
        ...prev,
        [key]: newStatus,
      }));
    });

    // Add player to bulk pending
    setBulkPendingPlayers(prev => new Set([...prev, playerId]));

    // Queue the bulk server update
    bulkUpdateQueueRef.current.set(playerId, {
      playerId,
      date,
      hours: allHours,
      status: newStatus,
    });

    // Signal user activity
    onUserActivity?.(true);

    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      onUserActivity?.(false);
    }, 2000);

    // Process updates after a short delay to allow for rapid clicking
    setTimeout(processUpdateQueue, 300);
  };

  const getStatus = (playerId: number, hour: string): AvailabilityStatus => {
    const key = `${playerId}-${hour}`;

    // Check for optimistic update first
    const optimistic = optimisticData[key];
    if (optimistic) return optimistic;

    // Fallback to server data
    const playerData = playerAvailabilities.find(
      pa => pa.player.id === playerId
    );
    return playerData?.availability[hour] || 'unknown';
  };

  const handleAddEarlyHour = () => {
    // Find the next available early hour to add
    const currentEarlyHours = allHours.filter(hour => parseInt(hour) < 19);
    const availableHours = AVAILABLE_EARLY_HOURS.filter(
      hour => !currentEarlyHours.includes(hour)
    );

    if (availableHours.length > 0) {
      // Add the latest available early hour (18, then 17, then 16)
      const nextHour = availableHours[availableHours.length - 1];
      setAdditionalHours(prev => [...prev, nextHour]);
    }
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
        <div className="flex items-center justify-center">
          <button
            onClick={handleAddEarlyHour}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 font-semibold text-gray-300 transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            title="Add earlier time slot"
            disabled={
              allHours.filter(hour => parseInt(hour) < 19).length >=
              AVAILABLE_EARLY_HOURS.length
            }
          >
            <PlusIcon className="h-3 w-3" />
          </button>
        </div>

        {playerAvailabilities.map(({ player }) => {
          const isBulkPending = bulkPendingPlayers.has(player.id);
          const bulkStatus = getBulkStatus(player.id);

          return (
            <button
              key={player.id}
              onClick={() => handleBulkStatusChange(player.id)}
              className={clsx(
                'flex items-center justify-center truncate rounded px-0.5 text-xs font-medium transition-all duration-150',
                'hover:bg-gray-700 hover:text-white active:bg-gray-600',
                'focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-950 focus:outline-none',
                isBulkPending
                  ? 'ring-opacity-75 bg-gray-800 text-blue-200 ring-2 ring-blue-400'
                  : 'text-gray-300',
                // Add a subtle color hint based on bulk status
                !isBulkPending && bulkStatus === 'ready' && 'text-emerald-300',
                !isBulkPending &&
                  bulkStatus === 'uncertain' &&
                  'text-amber-300',
                !isBulkPending && bulkStatus === 'unready' && 'text-red-300'
              )}
              title={`${player.name} - Click to set all times to ${getNextStatus(bulkStatus)}`}
            >
              {player.name}
            </button>
          );
        })}

        {/* Time slots rows */}
        {allHours.map(hour => (
          <div key={hour} className="contents">
            {/* Time label */}
            <div className="flex items-center justify-center text-xs font-light text-gray-300">
              {hour}:00
            </div>

            {/* Player status cells */}
            {playerAvailabilities.map(({ player }) => {
              const key = `${player.id}-${hour}`;
              const isPending = pendingUpdates.has(key);
              const isBulkPending = bulkPendingPlayers.has(player.id);

              return (
                <div key={key} className="flex items-center justify-center">
                  <StatusChip
                    status={getStatus(player.id, hour)}
                    onClick={() =>
                      handleStatusChange(
                        player.id,
                        hour,
                        getStatus(player.id, hour)
                      )
                    }
                    className={clsx(
                      'w-full transition-all duration-150',
                      (isPending || isBulkPending) &&
                        'ring-opacity-75 ring-2 ring-blue-400'
                    )}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
