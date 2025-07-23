'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { type Swiper as SwiperClass } from 'swiper';
import { clsx } from 'clsx';

interface NavigationButtonProps {
  direction: 'prev' | 'next';
  disabled: boolean;
  swiper: SwiperClass | null;
}

export function NavigationButton({
  direction,
  disabled,
  swiper,
}: NavigationButtonProps) {
  if (disabled || !swiper) {
    return <div className="h-8 w-8" />; // Placeholder space to maintain layout
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
      className={clsx(
        'flex h-8 w-8 items-center justify-center rounded-full border',
        'border-gray-600 bg-gray-800 text-blue-400 shadow-lg',
        'transition-all duration-200 hover:bg-gray-700 hover:shadow-xl'
      )}
      aria-label={direction === 'prev' ? 'Previous day' : 'Next day'}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
