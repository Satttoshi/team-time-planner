'use client';

import { useRef, useCallback } from 'react';
import { updateAvailabilityStatus, updateBulkAvailabilityStatus } from '@/lib/actions';
import { type AvailabilityStatus } from '@/lib/db/schema';

interface UpdateData {
  playerId: number;
  date: string;
  hour: string;
  status: AvailabilityStatus;
}

interface BulkUpdateData {
  playerId: number;
  date: string;
  hours: string[];
  status: AvailabilityStatus;
}

export interface UseUpdateQueueOptions {
  onPendingUpdatesChange: (updater: (prev: Set<string>) => Set<string>) => void;
  onBulkPendingPlayersChange: (updater: (prev: Set<number>) => Set<number>) => void;
}

export function useUpdateQueue({
  onPendingUpdatesChange,
  onBulkPendingPlayersChange,
}: UseUpdateQueueOptions) {
  const updateQueueRef = useRef<Map<string, UpdateData>>(new Map());
  const bulkUpdateQueueRef = useRef<Map<number, BulkUpdateData>>(new Map());
  const isProcessingRef = useRef(false);

  // Process queued updates in batches
  const processUpdateQueue = useCallback(async () => {
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
          onPendingUpdatesChange(prev => {
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
          onBulkPendingPlayersChange(prev => {
            const updated = new Set(prev);
            updated.delete(playerId);
            return updated;
          });
          // Remove individual pending updates for all hours affected
          onPendingUpdatesChange(prev => {
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
  }, [onPendingUpdatesChange, onBulkPendingPlayersChange]);

  const queueUpdate = useCallback((
    playerId: number,
    date: string,
    hour: string,
    status: AvailabilityStatus
  ) => {
    const key = `${playerId}-${hour}`;
    
    // Add to pending updates
    onPendingUpdatesChange((prev: Set<string>) => new Set([...prev, key]));

    // Queue the server update
    updateQueueRef.current.set(key, {
      playerId,
      date,
      hour,
      status,
    });

    // Process updates after a short delay to allow for rapid clicking
    setTimeout(processUpdateQueue, 300);
  }, [processUpdateQueue, onPendingUpdatesChange]);

  const queueBulkUpdate = useCallback((
    playerId: number,
    date: string,
    hours: string[],
    status: AvailabilityStatus
  ) => {
    // Add player to bulk pending
    onBulkPendingPlayersChange((prev: Set<number>) => new Set([...prev, playerId]));

    // Queue the bulk server update
    bulkUpdateQueueRef.current.set(playerId, {
      playerId,
      date,
      hours,
      status,
    });

    // Process updates after a short delay to allow for rapid clicking
    setTimeout(processUpdateQueue, 300);
  }, [processUpdateQueue, onBulkPendingPlayersChange]);

  return {
    updateQueueRef,
    bulkUpdateQueueRef,
    queueUpdate,
    queueBulkUpdate,
    processUpdateQueue,
  };
}