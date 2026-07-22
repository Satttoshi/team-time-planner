'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
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
  renameMatchDocument,
  type MatchDocumentListItem,
} from '@/lib/document-actions';
import { MatchPlannerHeader } from './MatchPlannerHeader';

interface DocumentListClientProps {
  initialDocuments: MatchDocumentListItem[];
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const iconButtonClasses = clsx(
  'flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors',
  'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground'
);

export function DocumentListClient({
  initialDocuments,
}: DocumentListClientProps) {
  const router = useRouter();
  const [documents, setDocuments] =
    useState<MatchDocumentListItem[]>(initialDocuments);
  const [isCreating, setIsCreating] = useState(false);
  const [renameTarget, setRenameTarget] =
    useState<MatchDocumentListItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<MatchDocumentListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshList = async () => {
    try {
      setDocuments(await getMatchDocuments());
    } catch (error) {
      console.error('Failed to refresh document list:', error);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const id = await createMatchDocument();
      router.push(`/match-planner/${id}`);
    } catch (error) {
      console.error('Failed to create document:', error);
      setIsCreating(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const title = renameValue.trim();
    if (!title) return;

    setIsRenaming(true);
    try {
      await renameMatchDocument(renameTarget.id, title);
      setRenameTarget(null);
      await refreshList();
    } catch (error) {
      console.error('Failed to rename document:', error);
    } finally {
      setIsRenaming(false);
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
            'focus-visible:ring-ring',
            isCreating && 'cursor-not-allowed opacity-50'
          )}
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <PlusIcon className="h-4 w-4" />
          )}
          New Match Plan
        </button>

        {documents.length === 0 ? (
          <div className="text-foreground-muted flex flex-col items-center gap-2 py-16 text-sm">
            <FileTextIcon className="h-8 w-8" />
            No match plans yet. Create one to get started.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map(document => (
              <li
                key={document.id}
                className={clsx(
                  'bg-surface border-border flex items-center gap-2 rounded-lg border p-2',
                  'hover:border-border-elevated transition-colors'
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
                      className="text-foreground-muted block text-xs"
                      suppressHydrationWarning
                    >
                      Updated {dateFormatter.format(new Date(document.updatedAt))}
                    </span>
                  </span>
                </Link>
                <button
                  className={iconButtonClasses}
                  title="Rename"
                  onClick={() => {
                    setRenameTarget(document);
                    setRenameValue(document.title);
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
        )}
      </div>

      {/* Rename dialog */}
      <Dialog.Root
        open={renameTarget !== null}
        onOpenChange={open => !open && setRenameTarget(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className={clsx(
              'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-16px)] max-w-md',
              '-translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-lg',
              'bg-surface-elevated border-border-elevated border'
            )}
          >
            <Dialog.Title className="text-foreground mb-2 text-lg font-semibold">
              Rename Match Plan
            </Dialog.Title>
            <Dialog.Description className="text-foreground-secondary mb-4 text-sm">
              Enter a new name for this match plan.
            </Dialog.Description>
            <form
              onSubmit={event => {
                event.preventDefault();
                handleRename();
              }}
            >
              <input
                className={clsx(
                  'bg-surface border-border text-foreground w-full rounded border px-3 py-2 text-sm',
                  'focus:ring-ring focus:ring-2 focus:outline-none'
                )}
                value={renameValue}
                onChange={event => setRenameValue(event.target.value)}
                autoFocus
                data-1p-ignore
                autoComplete="off"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className={clsx(
                    'rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
                    'text-foreground-secondary hover:bg-surface hover:text-foreground'
                  )}
                  onClick={() => setRenameTarget(null)}
                  disabled={isRenaming}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={clsx(
                    'bg-primary rounded px-4 py-2 text-sm font-medium text-white transition-colors',
                    'hover:bg-primary-hover focus:outline-none',
                    (isRenaming || !renameValue.trim()) &&
                      'cursor-not-allowed opacity-50'
                  )}
                  disabled={isRenaming || !renameValue.trim()}
                >
                  {isRenaming ? 'Saving…' : 'Save'}
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
          <Dialog.Content
            className={clsx(
              'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-16px)] max-w-md',
              '-translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-lg',
              'bg-surface-elevated border-border-elevated border'
            )}
          >
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
