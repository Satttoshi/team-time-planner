'use client';

import { AvailabilityGrid } from './AvailabilityGrid';
import { NavigationButton } from './NavigationButton';
import { BurgerMenu } from './BurgerMenu';
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
    <div className="bg-surface flex w-full flex-col shadow-lg">
      {/* Card Header */}
      <div
        className={clsx(
          'border-border border-b px-6 py-4',
          todayFlag ? 'bg-primary-bg' : 'bg-surface-elevated'
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

          {/* Date Title with Burger Menu */}
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">{displayDate}</h2>
              <BurgerMenu date={dateString} onDelete={onUpdate} />
            </div>
          </div>

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
      <div className="pb-8">
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
