'use client';

import Link from 'next/link';
import { FileTextIcon } from '@radix-ui/react-icons';
import { clsx } from 'clsx';

export function PlannerFooter() {
  return (
    <footer className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 border-t">
      <div className="container mx-auto flex h-14 items-center justify-center px-4">
        <Link
          href="/match-planner"
          className={clsx(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
            'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground',
            'transition-colors focus:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring'
          )}
        >
          <FileTextIcon className="h-4 w-4" />
          Match Plans
        </Link>
      </div>
    </footer>
  );
}
