'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

import { DayCard } from './DayCard';
import { formatDateForStorage } from '@/lib/dateUtils';
import { type PlayerAvailability } from '@/lib/actions';

interface SwiperContainerProps {
  dates: Date[];
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
  onUserActivity
}: SwiperContainerProps) {
  return (
    <div className="w-full h-full">
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
        className="w-full h-full"
      >
        {dates.map((date, index) => {
          const dateString = formatDateForStorage(date);
          const playerAvailabilities = playerAvailabilityMap[dateString] || [];

          return (
            <SwiperSlide key={dateString} className="h-full">
              <div className="w-full h-full flex items-center justify-center px-4">
                <div className="w-full max-w-4xl h-[600px]">
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
      <div className="swiper-button-prev !text-blue-600 !bg-white !rounded-full !w-10 !h-10 shadow-lg after:!text-sm after:!font-bold !left-4"></div>
      <div className="swiper-button-next !text-blue-600 !bg-white !rounded-full !w-10 !h-10 shadow-lg after:!text-sm after:!font-bold !right-4"></div>
    </div>
  );
}