'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard, Mousewheel } from 'swiper/modules';
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
}

export function SwiperContainer({
  dates,
  initialSlideIndex,
  playerAvailabilityMap,
  onUpdate,
  onUserActivity,
}: SwiperContainerProps) {
  return (
    <div className="h-full w-full">
      <Swiper
        modules={[Navigation, Keyboard, Mousewheel]}
        spaceBetween={16}
        slidesPerView={1}
        centeredSlides={true}
        initialSlide={initialSlideIndex}
        navigation={{
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        }}
        keyboard={{
          enabled: true,
          onlyInViewport: false,
        }}
        mousewheel={{
          forceToAxis: true,
          sensitivity: 1,
          releaseOnEdges: true,
        }}
        breakpoints={{
          640: {
            slidesPerView: 1.2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 1.5,
            spaceBetween: 24,
          },
          1024: {
            slidesPerView: 1,
            spaceBetween: 16,
          },
        }}
        className="h-full w-full"
      >
        {dates.map((date, index) => {
          const dateString = formatDateForStorage(date);
          const playerAvailabilities = playerAvailabilityMap[dateString] || [];

          return (
            <SwiperSlide key={dateString + index} className="h-full">
              <div className="flex h-full w-full items-center justify-center px-4">
                <div className="h-[600px] w-full max-w-4xl">
                  <DayCard
                    date={date}
                    dateString={dateString}
                    playerAvailabilities={playerAvailabilities}
                    onUpdate={onUpdate}
                    onUserActivity={onUserActivity}
                  />
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Navigation Buttons */}
      <div className="swiper-button-prev !left-4 !h-10 !w-10 !rounded-full !bg-white !text-blue-600 shadow-lg after:!text-sm after:!font-bold"></div>
      <div className="swiper-button-next !right-4 !h-10 !w-10 !rounded-full !bg-white !text-blue-600 shadow-lg after:!text-sm after:!font-bold"></div>
    </div>
  );
}
