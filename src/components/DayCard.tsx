'use client';

import { AvailabilityGrid } from './AvailabilityGrid';
import { formatDateForDisplay, isToday } from '@/lib/dateUtils';
import { type PlayerAvailability } from '@/lib/actions';
import { clsx } from 'clsx';

interface DayCardProps {
  date: Date;
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
  onUserActivity
}: DayCardProps) {
  const displayDate = formatDateForDisplay(date);
  const todayFlag = isToday(date);

  return (
    <div className={clsx(
      'bg-white rounded-lg shadow-md border w-full h-full flex flex-col',
      todayFlag && 'ring-2 ring-blue-500 border-blue-300'
    )}>
      {/* Card Header */}
      <div className={clsx(
        'px-6 py-4 border-b bg-gray-50 rounded-t-lg',
        todayFlag && 'bg-blue-50'
      )}>
        <h2 className={clsx(
          'text-lg font-semibold text-center',
          todayFlag ? 'text-blue-900' : 'text-gray-900'
        )}>
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