'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { type Swiper as SwiperClass } from 'swiper';

interface NavigationButtonProps {
  direction: 'prev' | 'next';
  disabled: boolean;
  swiper: SwiperClass | null;
}

export function NavigationButton({ direction, disabled, swiper }: NavigationButtonProps) {
  if (disabled || !swiper) {
    return <div className="w-10 h-10" />; // Placeholder space to maintain layout
  }

  const handleClick = () => {
    if (direction === 'prev') {
      swiper.slidePrev();
    } else {
      swiper.slideNext();
    }
  };

  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <button
      onClick={handleClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-blue-400 shadow-lg hover:bg-gray-700 hover:shadow-xl border border-gray-600 transition-all duration-200"
      aria-label={direction === 'prev' ? 'Previous day' : 'Next day'}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}