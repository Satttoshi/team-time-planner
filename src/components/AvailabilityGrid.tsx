'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { StatusChip, getNextStatus } from './StatusChip';
import { updateAvailabilityStatus, type PlayerAvailability } from '@/lib/actions';
import { type AvailabilityStatus } from '@/lib/db/schema';
import { clsx } from 'clsx';

interface AvailabilityGridProps {
  date: string;
  playerAvailabilities: PlayerAvailability[];
  onUpdate?: () => void;
  onUserActivity?: (isActive: boolean) => void;
}

const DEFAULT_HOURS = ['19', '20', '21', '22'];
const AVAILABLE_EARLY_HOURS = ['16', '17', '18'];

export function AvailabilityGrid({ 
  date, 
  playerAvailabilities, 
  onUpdate,
  onUserActivity
}: AvailabilityGridProps) {
  const [optimisticData, setOptimisticData] = useState<
    Record<string, AvailabilityStatus>
  >({});
  const [additionalHours, setAdditionalHours] = useState<string[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  
  const updateQueueRef = useRef<Map<string, {
    playerId: number;
    date: string;
    hour: string;
    status: AvailabilityStatus;
  }>>(new Map());
  const isProcessingRef = useRef(false);
  const activityTimeoutRef = useRef<NodeJS.Timeout>();

  // Get all hours that have any data, ensuring we include default hours and additional hours
  const allHours = Array.from(
    new Set([
      ...additionalHours,
      ...DEFAULT_HOURS,
      ...playerAvailabilities.flatMap(pa => 
        Object.keys(pa.availability)
      )
    ])
  ).sort((a, b) => parseInt(a) - parseInt(b));

  // Process queued updates in batches
  const processUpdateQueue = async () => {
    if (isProcessingRef.current || updateQueueRef.current.size === 0) {
      return;
    }

    isProcessingRef.current = true;
    const updates = Array.from(updateQueueRef.current.values());
    updateQueueRef.current.clear();

    // Process all updates
    const promises = updates.map(async ({ playerId, date, hour, status }) => {
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
        // Keep in pending on error, will retry
      }
    });

    await Promise.allSettled(promises);
    isProcessingRef.current = false;

    // Process any new updates that came in while we were processing
    if (updateQueueRef.current.size > 0) {
      setTimeout(processUpdateQueue, 100);
    }
  };

  const handleStatusChange = (playerId: number, hour: string, currentStatus: AvailabilityStatus) => {
    const newStatus = getNextStatus(currentStatus);
    const key = `${playerId}-${hour}`;
    
    // Immediate optimistic update
    setOptimisticData(prev => ({
      ...prev,
      [key]: newStatus
    }));

    // Add to pending updates
    setPendingUpdates(prev => new Set([...prev, key]));

    // Queue the server update
    updateQueueRef.current.set(key, {
      playerId,
      date,
      hour,
      status: newStatus
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
    const playerData = playerAvailabilities.find(pa => pa.player.id === playerId);
    return playerData?.availability[hour] || 'unknown';
  };

  const handleAddEarlyHour = () => {
    // Find the next available early hour to add
    const currentEarlyHours = allHours.filter(hour => parseInt(hour) < 19);
    const availableHours = AVAILABLE_EARLY_HOURS.filter(hour => 
      !currentEarlyHours.includes(hour)
    );
    
    if (availableHours.length > 0) {
      // Add the latest available early hour (18, then 17, then 16)
      const nextHour = availableHours[availableHours.length - 1];
      setAdditionalHours(prev => [...prev, nextHour]);
    }
  };

  return (
    <div className="w-full">
      <div 
        className="grid gap-1 p-4"
        style={{
          gridTemplateColumns: `60px repeat(${playerAvailabilities.length}, 1fr)`,
          gridTemplateRows: `40px repeat(${allHours.length}, 40px)`
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-center">
          <button 
            onClick={handleAddEarlyHour}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add earlier time slot"
            disabled={allHours.filter(hour => parseInt(hour) < 19).length >= AVAILABLE_EARLY_HOURS.length}
          >
            +
          </button>
        </div>
        
        {playerAvailabilities.map(({ player }) => (
          <div
            key={player.id}
            className="flex items-center justify-center font-medium text-sm text-gray-700 truncate px-1"
            title={player.name}
          >
            {player.name}
          </div>
        ))}

        {/* Time slots rows */}
        {allHours.map(hour => (
          <div key={hour} className="contents">
            {/* Time label */}
            <div className="flex items-center justify-center font-medium text-sm text-gray-700">
              {hour}:00
            </div>
            
            {/* Player status cells */}
            {playerAvailabilities.map(({ player }) => {
              const key = `${player.id}-${hour}`;
              const isPending = pendingUpdates.has(key);
              
              return (
                <div key={key} className="flex items-center justify-center">
                  <StatusChip
                    status={getStatus(player.id, hour)}
                    onClick={() => handleStatusChange(player.id, hour, getStatus(player.id, hour))}
                    className={clsx(
                      'w-full max-w-[80px] transition-all duration-150',
                      isPending && 'ring-2 ring-blue-300 ring-opacity-50'
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