'use client';

import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard, Mousewheel } from 'swiper/modules';
import { type Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';

import { DayCard } from './DayCard';
import { formatDateForStorage } from '@/lib/dateUtils';
import { type PlayerAvailability } from '@/lib/actions';
import { Temporal } from 'temporal-polyfill';

interface SwiperContainerProps {
  dates: Temporal.PlainDate[];
  initialSlideIndex: number;
  playerAvailabilityMap: Record<string, PlayerAvailability[]>;
  onUpdate?: () => void;
  onUserActivity?: (isActive: boolean) => void;
  onPlayersReordered?: () => void;
}

export function SwiperContainer({
  dates,
  initialSlideIndex,
  playerAvailabilityMap,
  onUpdate,
  onUserActivity,
  onPlayersReordered,
}: SwiperContainerProps) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperClass | null>(
    null
  );
  const [navigationState, setNavigationState] = useState({
    isBeginning: true,
    isEnd: false,
  });

  const handleSwiperInit = (swiper: SwiperClass) => {
    setSwiperInstance(swiper);
    setNavigationState({
      isBeginning: swiper.isBeginning,
      isEnd: swiper.isEnd,
    });

    swiper.on('slideChange', () => {
      setNavigationState({
        isBeginning: swiper.isBeginning,
        isEnd: swiper.isEnd,
      });
    });
  };

  return (
    <Swiper
      modules={[Navigation, Keyboard, Mousewheel]}
      spaceBetween={16}
      slidesPerView={1}
      centeredSlides={true}
      initialSlide={initialSlideIndex}
      onSwiper={handleSwiperInit}
      keyboard={{
        enabled: true,
        onlyInViewport: false,
      }}
      mousewheel={{
        forceToAxis: true,
        sensitivity: 1,
        releaseOnEdges: true,
      }}
      className="h-full sm:w-[600px]"
    >
      {dates.map((date, index) => {
        const dateString = formatDateForStorage(date);
        const playerAvailabilities = playerAvailabilityMap[dateString] || [];

        return (
          <SwiperSlide key={dateString + index} className="h-full">
            <div className="w-max-[600px] flex justify-center">
              <div className="w-full">
                <DayCard
                  date={date}
                  dateString={dateString}
                  playerAvailabilities={playerAvailabilities}
                  onUpdate={onUpdate}
                  onUserActivity={onUserActivity}
                  onPlayersReordered={onPlayersReordered}
                  swiper={swiperInstance}
                  canGoPrev={!navigationState.isBeginning}
                  canGoNext={!navigationState.isEnd}
                />
              </div>
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
