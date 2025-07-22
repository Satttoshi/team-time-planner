'use client';

import { AvailabilityGrid } from './AvailabilityGrid';
import { formatDateForDisplay, isToday } from '@/lib/dateUtils';
import { type PlayerAvailability } from '@/lib/actions';
import { clsx } from 'clsx';
import { Temporal } from 'temporal-polyfill';

interface DayCardProps {
  date: Temporal.PlainDate;
  dateString: string; // YYYY-MM-DD format
  playerAvailabilities: PlayerAvailability[];
  onUpdate?: () => void;
  onUserActivity?: (isActive: boolean) => void;
}

export function DayCard({
  date,
  dateString,
  playerAvailabilities,
  onUpdate,
  onUserActivity,
}: DayCardProps) {
  const displayDate = formatDateForDisplay(date);
  const todayFlag = isToday(date);

  return (
    <div
      className={clsx(
        'flex h-full w-full flex-col rounded-lg border bg-white shadow-md',
        todayFlag && 'border-blue-300 ring-2 ring-blue-500'
      )}
    >
      {/* Card Header */}
      <div
        className={clsx(
          'rounded-t-lg border-b bg-gray-50 px-6 py-4',
          todayFlag && 'bg-blue-50'
        )}
      >
        <h2
          className={clsx(
            'text-center text-lg font-semibold',
            todayFlag ? 'text-blue-900' : 'text-gray-900'
          )}
        >
          {displayDate}
          {todayFlag && (
            <span className="ml-2 text-sm font-normal text-blue-600">
              (Today)
            </span>
          )}
        </h2>
      </div>

      {/* Card Content */}
      <div className="flex-1 overflow-hidden">
        <AvailabilityGrid
          date={dateString}
          playerAvailabilities={playerAvailabilities}
          onUpdate={onUpdate}
          onUserActivity={onUserActivity}
        />
      </div>
    </div>
  );
}
