'use client';

export function PresenceIndicator() {
  return (
    <div className="text-primary flex items-center gap-2 text-xs font-medium whitespace-nowrap">
      <span className="relative flex h-2 w-2">
        <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
        <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
      </span>
      Somebody is editing…
    </div>
  );
}
