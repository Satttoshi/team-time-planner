'use client';

import { PlusIcon } from '@radix-ui/react-icons';
import { clsx } from 'clsx';
import { type PlayerAvailability } from '@/lib/actions';
import { type AvailabilityStatus } from '@/lib/db/schema';
import { getNextStatus } from '../StatusChip';
import { getBulkStatus } from '@/lib/gridUtils';

interface GridHeaderProps {
  playerAvailabilities: PlayerAvailability[];
  allHours: string[];
  optimisticData: Record<string, AvailabilityStatus>;
  bulkPendingPlayers: Set<number>;
  canAddEarlyHour: boolean;
  onAddEarlyHour: () => void;
  onBulkStatusChange: (playerId: number) => void;
}

export function GridHeader({
  playerAvailabilities,
  allHours,
  optimisticData,
  bulkPendingPlayers,
  canAddEarlyHour,
  onAddEarlyHour,
  onBulkStatusChange,
}: GridHeaderProps) {
  return (
    <>
      {/* Add early hour button */}
      <div className="flex items-center justify-center">
        <button
          onClick={onAddEarlyHour}
          className={clsx(
            'flex h-5 w-5 items-center justify-center rounded-full',
            'bg-surface-elevated font-semibold text-foreground-secondary transition-colors',
            'hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-ring-offset'
          )}
          title="Add earlier time slot"
          disabled={!canAddEarlyHour}
        >
          <PlusIcon className="h-3 w-3" />
        </button>
      </div>

      {/* Player header cells */}
      {playerAvailabilities.map(({ player }) => {
        const isBulkPending = bulkPendingPlayers.has(player.id);
        const bulkStatus = getBulkStatus(player.id, allHours, optimisticData, playerAvailabilities);

        return (
          <button
            key={player.id}
            onClick={() => onBulkStatusChange(player.id)}
            className={clsx(
              'flex items-center justify-center truncate rounded px-0.5',
              'text-xs font-medium transition-all duration-150',
              'hover:bg-surface-elevated hover:text-foreground active:bg-surface',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'focus:ring-offset-2 focus:ring-offset-ring-offset',
              isBulkPending
                ? clsx(
                    'bg-surface-elevated text-primary ring-2 ring-primary',
                    'ring-opacity-75'
                  )
                : 'text-foreground-secondary',
              // Add a subtle color hint based on bulk status
              !isBulkPending && bulkStatus === 'ready' && 'text-status-ready',
              !isBulkPending &&
                bulkStatus === 'uncertain' &&
                'text-status-uncertain',
              !isBulkPending && bulkStatus === 'unready' && 'text-status-unready'
            )}
            title={`${player.name} - Click to set all times to ${getNextStatus(
              bulkStatus
            )}`}
          >
            {player.name}
          </button>
        );
      })}
    </>
  );
}