'use client';

import { clsx } from 'clsx';
import { StatusChip } from '../StatusChip';
import { type PlayerAvailability } from '@/lib/actions';
import { type AvailabilityStatus } from '@/lib/db/schema';
import { getStatus } from '@/lib/gridUtils';

interface TimeSlotRowProps {
  hour: string;
  playerAvailabilities: PlayerAvailability[];
  optimisticData: Record<string, AvailabilityStatus>;
  pendingUpdates: Set<string>;
  bulkPendingPlayers: Set<number>;
  onStatusChange: (playerId: number, hour: string, currentStatus: AvailabilityStatus) => void;
}

export function TimeSlotRow({
  hour,
  playerAvailabilities,
  optimisticData,
  pendingUpdates,
  bulkPendingPlayers,
  onStatusChange,
}: TimeSlotRowProps) {
  return (
    <div key={hour} className="contents">
      {/* Time label */}
      <div className="flex items-center justify-center text-xs font-light text-foreground-secondary">
        {hour}:00
      </div>

      {/* Player status cells */}
      {playerAvailabilities.map(({ player }) => {
        const key = `${player.id}-${hour}`;
        const isPending = pendingUpdates.has(key);
        const isBulkPending = bulkPendingPlayers.has(player.id);
        const currentStatus = getStatus(player.id, hour, optimisticData, playerAvailabilities);

        return (
          <div key={key} className="flex items-center justify-center">
            <StatusChip
              status={currentStatus}
              onClick={() => onStatusChange(player.id, hour, currentStatus)}
              className={clsx(
                'w-full transition-all duration-150',
                (isPending || isBulkPending) &&
                  'ring-opacity-75 ring-2 ring-primary'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}