'use client';

import { type AvailabilityStatus } from '@/lib/db/schema';
import { clsx } from 'clsx';

interface StatusChipProps {
  status: AvailabilityStatus;
  onClick: () => void;
  className?: string;
}

const statusConfig = {
  ready: {
    label: 'Ready',
    bgColor: 'bg-emerald-800 hover:bg-emerald-700',
    textColor: 'text-emerald-100',
    borderColor: 'border-emerald-600',
  },
  uncertain: {
    label: 'Maybe',
    bgColor: 'bg-amber-800 hover:bg-amber-700',
    textColor: 'text-amber-100',
    borderColor: 'border-amber-600',
  },
  unready: {
    label: 'No',
    bgColor: 'bg-red-800 hover:bg-red-700',
    textColor: 'text-red-100',
    borderColor: 'border-red-600',
  },
  unknown: {
    label: '?',
    bgColor: 'bg-gray-800 hover:bg-gray-700',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-600',
  },
};

export function StatusChip({ status, onClick, className }: StatusChipProps) {
  const config = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex h-8 min-w-[50px] items-center justify-center',
        'rounded border px-1 py-0.5 text-xs transition-colors duration-150',
        config.bgColor,
        config.textColor,
        config.borderColor,
        'focus:outline-none focus:ring-2 focus:ring-blue-400',
        'focus:ring-offset-2 focus:ring-offset-gray-950',
        className
      )}
    >
      {config.label}
    </button>
  );
}

// Helper function to cycle through statuses
export function getNextStatus(
  currentStatus: AvailabilityStatus
): AvailabilityStatus {
  const statusOrder: AvailabilityStatus[] = [
    'unknown',
    'ready',
    'uncertain',
    'unready',
  ];
  const currentIndex = statusOrder.indexOf(currentStatus);
  const nextIndex = (currentIndex + 1) % statusOrder.length;
  return statusOrder[nextIndex];
}
