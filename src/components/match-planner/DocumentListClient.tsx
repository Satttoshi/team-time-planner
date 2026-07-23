'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  CalendarIcon,
  ChevronDownIcon,
  Cross2Icon,
  FileTextIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { clsx } from 'clsx';
import {
  createMatchDocument,
  deleteMatchDocument,
  getMatchDocuments,
  updateMatchDocumentDetails,
  type MatchDocumentListItem,
} from '@/lib/document-actions';
import {
  defaultMatchDateInputValue,
  formatMatchDate,
  matchDateInputToIso,
  toMatchDateInputValue,
} from '@/lib/dateUtils';
import { MatchPlannerHeader } from './MatchPlannerHeader';

interface DocumentListClientProps {
  initialDocuments: MatchDocumentListItem[];
}

const updatedFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// A match that started less than 3h ago is still "upcoming" (likely ongoing)
const ONGOING_GRACE_MS = 3 * 60 * 60 * 1000;

const iconButtonClasses = clsx(
  'flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors',
  'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground'
);

// 16px (text-base) is deliberate: iOS Safari auto-zooms the page when a
// focused form control renders below 16px.
const inputClasses = clsx(
  'bg-surface border-border text-foreground w-full rounded border px-3 py-2 text-base',
  'focus:ring-ring focus:ring-2 focus:outline-none'
);

const labelClasses = 'text-foreground-secondary mb-1 block text-xs font-medium';

const selectClasses = clsx(
  'bg-surface border-border text-foreground rounded border py-2 pr-8 pl-3 text-base',
  'appearance-none focus:ring-ring focus:ring-2 focus:outline-none'
);

const selectChevronClasses = clsx(
  'text-foreground-muted pointer-events-none absolute top-1/2 right-2.5',
  'h-3.5 w-3.5 -translate-y-1/2'
);

const dialogContentClasses = clsx(
  'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-16px)] max-w-md',
  '-translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-lg',
  'bg-surface-elevated border-border-elevated border'
);

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0')
);
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// Native pickers ignore `step` for their minute list, so the time part is
// rendered as explicit selects to enforce quarter-hour steps.
function MatchDateTimeFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [datePart = '', timePart = ''] = value.split('T');
  const hour = timePart.slice(0, 2) || '20';
  const minute = timePart.slice(3, 5) || '00';

  const compose = (day: string, h: string, m: string) =>
    day ? `${day}T${h}:${m}` : '';

  return (
    <div className="flex items-center gap-2">
      <input
        id={`${idPrefix}-date`}
        type="date"
        className={clsx(inputClasses, 'min-w-0 flex-1')}
        value={datePart}
        onChange={event => onChange(compose(event.target.value, hour, minute))}
        required
      />
      <div className="relative shrink-0">
        <select
          aria-label="Hour (CET)"
          className={selectClasses}
          value={hour}
          onChange={event =>
            onChange(compose(datePart, event.target.value, minute))
          }
        >
          {HOUR_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDownIcon className={selectChevronClasses} />
      </div>
      <span className="text-foreground-secondary text-sm">:</span>
      <div className="relative shrink-0">
        <select
          aria-label="Minute (CET)"
          className={selectClasses}
          value={minute}
          onChange={event =>
            onChange(compose(datePart, hour, event.target.value))
          }
        >
          {MINUTE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDownIcon className={selectChevronClasses} />
      </div>
    </div>
  );
}

export function DocumentListClient({
  initialDocuments,
}: DocumentListClientProps) {
  const router = useRouter();
  const [documents, setDocuments] =
    useState<MatchDocumentListItem[]>(initialDocuments);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<MatchDocumentListItem | null>(
    null
  );
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<MatchDocumentListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const sorted = [...documents].sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );
  const upcoming = sorted.filter(
    document => new Date(document.matchDate).getTime() >= now - ONGOING_GRACE_MS
  );
  const past = sorted
    .filter(
      document =>
        new Date(document.matchDate).getTime() < now - ONGOING_GRACE_MS
    )
    .reverse();

  const refreshList = async () => {
    try {
      setDocuments(await getMatchDocuments());
      setNow(Date.now());
    } catch (error) {
      console.error('Failed to refresh document list:', error);
    }
  };

  const handleCreate = async () => {
    if (!createDate) return;

    setIsCreating(true);
    try {
      const id = await createMatchDocument(
        createTitle.trim() || undefined,
        matchDateInputToIso(createDate)
      );
      router.push(`/match-planner/${id}`);
    } catch (error) {
      console.error('Failed to create document:', error);
      setIsCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const title = editTitle.trim();
    if (!title || !editDate) return;

    setIsSaving(true);
    try {
      await updateMatchDocumentDetails(
        editTarget.id,
        title,
        matchDateInputToIso(editDate)
      );
      setEditTarget(null);
      await refreshList();
    } catch (error) {
      console.error('Failed to update document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteMatchDocument(deleteTarget.id);
      setDeleteTarget(null);
      await refreshList();
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderDocuments = (items: MatchDocumentListItem[], isPast: boolean) => (
    <ul className="flex flex-col gap-2">
      {items.map(document => (
        <li
          key={document.id}
          className={clsx(
            'bg-surface border-border flex items-center gap-2 rounded-lg border p-2',
            'hover:border-border-elevated transition-colors',
            isPast && 'opacity-75'
          )}
        >
          <Link
            href={`/match-planner/${document.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded px-2 py-2"
          >
            <FileTextIcon className="text-foreground-muted h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="text-foreground block truncate text-sm font-medium">
                {document.title}
              </span>
              <span
                className={clsx(
                  'flex items-center gap-1.5 text-sm font-medium',
                  isPast ? 'text-foreground-secondary' : 'text-primary'
                )}
                suppressHydrationWarning
              >
                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                {formatMatchDate(new Date(document.matchDate))}
              </span>
              <span
                className="text-foreground-muted block text-xs"
                suppressHydrationWarning
              >
                Updated {updatedFormatter.format(new Date(document.updatedAt))}
              </span>
            </span>
          </Link>
          <button
            className={iconButtonClasses}
            title="Edit name & date"
            onClick={() => {
              setEditTarget(document);
              setEditTitle(document.title);
              setEditDate(toMatchDateInputValue(new Date(document.matchDate)));
            }}
          >
            <Pencil1Icon className="h-4 w-4" />
          </button>
          <button
            className={iconButtonClasses}
            title="Delete"
            onClick={() => setDeleteTarget(document)}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );

  const sectionHeadingClasses =
    'text-foreground-secondary mb-2 text-xs font-semibold tracking-wide uppercase';

  return (
    <main className="min-h-screen">
      <MatchPlannerHeader backHref="/" backLabel="Back to planner">
        <h1 className="text-foreground truncate text-lg font-semibold">
          Match Plans
        </h1>
      </MatchPlannerHeader>

      <div className="container mx-auto max-w-3xl px-4 py-6">
        <button
          className={clsx(
            'mb-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
            'bg-primary-bg text-primary text-sm font-medium transition-colors',
            'hover:brightness-110 focus:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring'
          )}
          onClick={() => {
            setCreateTitle('');
            setCreateDate(defaultMatchDateInputValue());
            setCreateOpen(true);
          }}
        >
          <PlusIcon className="h-4 w-4" />
          New Match Plan
        </button>

        {documents.length === 0 ? (
          <div className="text-foreground-muted flex flex-col items-center gap-2 py-16 text-sm">
            <FileTextIcon className="h-8 w-8" />
            No match plans yet. Create one to get started.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section>
              <h2 className={sectionHeadingClasses}>Upcoming</h2>
              {upcoming.length === 0 ? (
                <p className="text-foreground-muted text-sm">
                  No upcoming matches.
                </p>
              ) : (
                renderDocuments(upcoming, false)
              )}
            </section>
            {past.length > 0 && (
              <section>
                <h2 className={sectionHeadingClasses}>Past</h2>
                {renderDocuments(past, true)}
              </section>
            )}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog.Root
        open={createOpen}
        onOpenChange={open => !open && !isCreating && setCreateOpen(false)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className={dialogContentClasses}
            onInteractOutside={event => event.preventDefault()}
            onOpenAutoFocus={event => event.preventDefault()}
          >
            <Dialog.Title className="text-foreground mb-2 text-lg font-semibold">
              New Match Plan
            </Dialog.Title>
            <Dialog.Description className="text-foreground-secondary mb-4 text-sm">
              Set the FACEIT match date and time (CET).
            </Dialog.Description>
            <form
              onSubmit={event => {
                event.preventDefault();
                handleCreate();
              }}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClasses} htmlFor="create-title">
                    Title
                  </label>
                  <input
                    id="create-title"
                    className={inputClasses}
                    value={createTitle}
                    onChange={event => setCreateTitle(event.target.value)}
                    placeholder="Untitled match plan"
                    data-1p-ignore
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="create-date">
                    Match date &amp; time (CET)
                  </label>
                  <MatchDateTimeFields
                    idPrefix="create"
                    value={createDate}
                    onChange={setCreateDate}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className={clsx(
                    'rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                    'text-foreground-secondary hover:bg-surface hover:text-foreground'
                  )}
                  onClick={() => setCreateOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={clsx(
                    'bg-primary rounded px-4 py-2 text-sm font-medium text-white transition-colors',
                    'hover:bg-primary-hover focus:outline-none',
                    (isCreating || !createDate) &&
                      'cursor-not-allowed opacity-50'
                  )}
                  disabled={isCreating || !createDate}
                >
                  {isCreating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
            <Dialog.Close asChild>
              <button
                className={clsx(
                  'absolute top-4 right-4 rounded p-1 transition-colors focus:outline-none',
                  'text-foreground-muted hover:bg-surface hover:text-foreground-secondary'
                )}
                aria-label="Close"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit dialog */}
      <Dialog.Root
        open={editTarget !== null}
        onOpenChange={open => !open && setEditTarget(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className={dialogContentClasses}
            onInteractOutside={event => event.preventDefault()}
            onOpenAutoFocus={event => event.preventDefault()}
          >
            <Dialog.Title className="text-foreground mb-2 text-lg font-semibold">
              Edit Match Plan
            </Dialog.Title>
            <Dialog.Description className="text-foreground-secondary mb-4 text-sm">
              Change the name or the match date and time (CET).
            </Dialog.Description>
            <form
              onSubmit={event => {
                event.preventDefault();
                handleEdit();
              }}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClasses} htmlFor="edit-title">
                    Title
                  </label>
                  <input
                    id="edit-title"
                    className={inputClasses}
                    value={editTitle}
                    onChange={event => setEditTitle(event.target.value)}
                    data-1p-ignore
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="edit-date">
                    Match date &amp; time (CET)
                  </label>
                  <MatchDateTimeFields
                    idPrefix="edit"
                    value={editDate}
                    onChange={setEditDate}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className={clsx(
                    'rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                    'text-foreground-secondary hover:bg-surface hover:text-foreground'
                  )}
                  onClick={() => setEditTarget(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={clsx(
                    'bg-primary rounded px-4 py-2 text-sm font-medium text-white transition-colors',
                    'hover:bg-primary-hover focus:outline-none',
                    (isSaving || !editTitle.trim() || !editDate) &&
                      'cursor-not-allowed opacity-50'
                  )}
                  disabled={isSaving || !editTitle.trim() || !editDate}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
            <Dialog.Close asChild>
              <button
                className={clsx(
                  'absolute top-4 right-4 rounded p-1 transition-colors focus:outline-none',
                  'text-foreground-muted hover:bg-surface hover:text-foreground-secondary'
                )}
                aria-label="Close"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={deleteTarget !== null}
        onOpenChange={open => !open && setDeleteTarget(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className={dialogContentClasses}>
            <Dialog.Title className="text-foreground mb-2 text-lg font-semibold">
              Delete Match Plan
            </Dialog.Title>
            <Dialog.Description className="text-foreground-secondary mb-4 text-sm">
              Are you sure you want to delete “{deleteTarget?.title}”? This
              action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                className={clsx(
                  'rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                  'text-foreground-secondary hover:bg-surface hover:text-foreground'
                )}
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className={clsx(
                  'flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                  'bg-status-unready-bg text-foreground hover:brightness-110',
                  isDeleting && 'cursor-not-allowed opacity-50'
                )}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-3 w-3" />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
