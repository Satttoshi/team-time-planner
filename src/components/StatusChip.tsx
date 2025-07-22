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
    bgColor: 'bg-green-100 hover:bg-green-200',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
  },
  uncertain: {
    label: 'Maybe',
    bgColor: 'bg-yellow-100 hover:bg-yellow-200',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300',
  },
  unready: {
    label: 'No',
    bgColor: 'bg-red-100 hover:bg-red-200',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
  },
  unknown: {
    label: '?',
    bgColor: 'bg-gray-100 hover:bg-gray-200',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
  },
};

export function StatusChip({ status, onClick, className }: StatusChipProps) {
  const config = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex h-8 min-w-[50px] items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium transition-colors duration-150',
        config.bgColor,
        config.textColor,
        config.borderColor,
        'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
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
