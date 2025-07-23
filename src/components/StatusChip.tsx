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
    classes:
      'bg-status-ready-bg text-status-ready border-status-ready hover:brightness-110',
  },
  uncertain: {
    label: 'Maybe',
    classes:
      'bg-status-uncertain-bg text-status-uncertain border-status-uncertain hover:brightness-110',
  },
  unready: {
    label: 'No',
    classes:
      'bg-status-unready-bg text-status-unready border-status-unready hover:brightness-110',
  },
  unknown: {
    label: '?',
    classes:
      'bg-status-unknown-bg text-status-unknown border-border-elevated hover:brightness-110',
  },
};

export function StatusChip({ status, onClick, className }: StatusChipProps) {
  const config = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex h-8 min-w-[50px] items-center justify-center',
        'rounded border px-1 py-0.5 text-xs transition-all duration-150',
        'focus:ring-ring focus:ring-2 focus:outline-none',
        'focus:ring-offset-ring-offset focus:ring-offset-2',
        config.classes,
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
