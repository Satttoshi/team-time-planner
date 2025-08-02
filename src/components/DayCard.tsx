'use client';

import { AvailabilityGrid } from './AvailabilityGrid';
import { NavigationButton } from './NavigationButton';
import { BurgerMenu } from './BurgerMenu';
import {
  formatDateForDisplay,
  isToday,
  findPlayDayOpportunities,
} from '@/lib/dateUtils';
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
  onPlayersReordered?: () => void;
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
  onPlayersReordered,
  swiper,
  canGoPrev,
  canGoNext,
}: DayCardProps) {
  const displayDate = formatDateForDisplay(date);
  const todayFlag = isToday(date);

  const playDayOpportunities = findPlayDayOpportunities(playerAvailabilities);

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
              <BurgerMenu 
                date={dateString} 
                onDelete={onUpdate} 
                onPlayersReordered={onPlayersReordered}
              />
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

        {/* Play Day Information */}
        <div className="px-6 pt-6">
          {playDayOpportunities.length > 0 ? (
            <div className="space-y-2">
              {playDayOpportunities.map((opp, index) => (
                <div
                  key={`${opp.startHour}-${opp.endHour}-${index}`}
                  className="text-center"
                >
                  <h3 className="text-foreground text-lg font-bold">
                    Possible Playday {opp.startHour.toString().padStart(2, '0')}
                    :00-{(opp.endHour + 1).toString().padStart(2, '0')}:00
                  </h3>
                  <p className="text-status-ready text-sm">
                    {opp.playerCount} players available
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-foreground-muted text-lg font-bold">
                No Practice Opportunity
              </h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
