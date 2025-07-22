'use client';

import { AvailabilityGrid } from './AvailabilityGrid';
import { NavigationButton } from './NavigationButton';
import { formatDateForDisplay, isToday } from '@/lib/dateUtils';
import { type PlayerAvailability } from '@/lib/actions';
import { clsx } from 'clsx';
import { Temporal } from 'temporal-polyfill';
import { type Swiper as SwiperClass } from 'swiper';

interface DayCardProps {
  date: Temporal.PlainDate;
  dateString: string; // YYYY-MM-DD format
  playerAvailabilities: PlayerAvailability[];
  onUpdate?: () => void;
  onUserActivity?: (isActive: boolean) => void;
  swiper: SwiperClass | null;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function DayCard({
  date,
  dateString,
  playerAvailabilities,
  onUpdate,
  onUserActivity,
  swiper,
  canGoPrev,
  canGoNext,
}: DayCardProps) {
  const displayDate = formatDateForDisplay(date);
  const todayFlag = isToday(date);

  return (
    <div
      className={clsx(
        'flex h-full w-full flex-col rounded-lg border bg-white shadow-md',
        todayFlag && 'bg-amber-300'
      )}
    >
      {/* Card Header */}
      <div
        className={clsx(
          'rounded-t-lg border-b bg-gray-50 px-4 py-4',
          todayFlag && 'bg-blue-50'
        )}
      >
        <div className="flex items-center justify-between">
          {/* Left Navigation */}
          <div className="flex items-center space-x-2">
            <NavigationButton
              direction="prev"
              disabled={!canGoPrev}
              swiper={swiper}
            />
          </div>

          {/* Date Title */}
          <h2
            className={clsx(
              'flex-1 text-center text-lg font-semibold',
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

          {/* Right Navigation */}
          <div className="flex items-center space-x-2">
            <NavigationButton
              direction="next"
              disabled={!canGoNext}
              swiper={swiper}
            />
          </div>
        </div>
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
