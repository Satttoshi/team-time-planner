'use client';

import Link from 'next/link';
import { ArrowLeftIcon, HomeIcon } from '@radix-ui/react-icons';
import { clsx } from 'clsx';

interface MatchPlannerHeaderProps {
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

const iconLinkClasses = clsx(
  'flex h-9 w-9 shrink-0 items-center justify-center rounded transition-colors',
  'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground'
);

export function MatchPlannerHeader({
  backHref,
  backLabel,
  children,
}: MatchPlannerHeaderProps) {
  return (
    <header className="bg-surface border-border sticky top-0 z-40 border-b">
      <div className="container mx-auto flex h-14 items-center gap-2 px-4">
        {backHref && (
          <Link href={backHref} className={iconLinkClasses} title={backLabel}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
        <Link href="/" className={iconLinkClasses} title="Back to planner">
          <HomeIcon className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
