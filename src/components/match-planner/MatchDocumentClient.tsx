'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor, JSONContent } from '@tiptap/react';
import type { MatchDocument } from '@/lib/db/schema';
import {
  clearPresence,
  getMatchDocument,
  heartbeatPresence,
  renameMatchDocument,
  saveMatchDocument,
} from '@/lib/document-actions';
import { usePolling } from '@/hooks/usePolling';
import { clsx } from 'clsx';
import { DocumentEditor } from './DocumentEditor';
import { MatchPlannerHeader } from './MatchPlannerHeader';
import { PresenceIndicator } from './PresenceIndicator';

const SAVE_DEBOUNCE_MS = 1000; // allow rapid typing before syncing
const ACTIVITY_TIMEOUT_MS = 2000; // matches the availability grid behavior
const HEARTBEAT_INTERVAL_MS = 5000;
const PRESENCE_FRESH_MS = 15000;
const POLL_INTERVAL_MS = 4000;

type SaveState = 'saved' | 'dirty' | 'saving';

interface MatchDocumentClientProps {
  initialDocument: MatchDocument;
}

function hasOtherEditors(presence: unknown, ownClientId: string): boolean {
  if (!presence || typeof presence !== 'object') return false;

  const now = Date.now();
  return Object.entries(presence as Record<string, string>).some(
    ([clientId, timestamp]) => {
      if (clientId === ownClientId) return false;
      const lastSeen = Date.parse(timestamp);
      return !Number.isNaN(lastSeen) && now - lastSeen < PRESENCE_FRESH_MS;
    }
  );
}

export function MatchDocumentClient({
  initialDocument,
}: MatchDocumentClientProps) {
  const [clientId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(initialDocument.title);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [isUserActive, setIsUserActive] = useState(false);
  const [showConflictNotice, setShowConflictNotice] = useState(false);
  const [othersEditing, setOthersEditing] = useState(() =>
    hasOtherEditors(initialDocument.presence, clientId)
  );

  const editorRef = useRef<Editor | null>(null);
  const versionRef = useRef(initialDocument.version);
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const isTitleFocusedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const conflictTimerRef = useRef<NodeJS.Timeout | null>(null);

  const documentId = initialDocument.id;

  const markUserActive = useCallback(() => {
    setIsUserActive(true);
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => {
      setIsUserActive(false);
    }, ACTIVITY_TIMEOUT_MS);
  }, []);

  const flashConflictNotice = useCallback(() => {
    setShowConflictNotice(true);
    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    conflictTimerRef.current = setTimeout(() => {
      setShowConflictNotice(false);
    }, 4000);
  }, []);

  // Ref indirection so the save routine can re-invoke itself (retry / queued edits)
  const performSaveRef = useRef<() => Promise<void>>(async () => {});

  const performSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || isSavingRef.current) return;

    isSavingRef.current = true;
    isDirtyRef.current = false;
    setSaveState('saving');

    try {
      // getJSON() embeds ProseMirror's null-prototype attrs objects, which
      // React refuses to serialize into a server action — round-trip through
      // JSON to get plain objects (otherwise image attrs are dropped).
      const content = JSON.parse(
        JSON.stringify(editor.getJSON())
      ) as JSONContent;

      const result = await saveMatchDocument(
        documentId,
        content,
        versionRef.current
      );

      if (result.conflict) {
        // Someone else saved first — take their version instead of clobbering it
        versionRef.current = result.latest.version;
        editor.commands.setContent(result.latest.content as JSONContent, {
          emitUpdate: false,
        });
        isDirtyRef.current = false;
        setTitle(result.latest.title);
        setSaveState('saved');
        flashConflictNotice();
      } else {
        versionRef.current = result.version;
        setSaveState(isDirtyRef.current ? 'dirty' : 'saved');
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      isDirtyRef.current = true;
      setSaveState('dirty');
      // Retry after the debounce delay
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void performSaveRef.current();
      }, SAVE_DEBOUNCE_MS);
    } finally {
      isSavingRef.current = false;
      if (isDirtyRef.current && !saveTimerRef.current) {
        void performSaveRef.current();
      }
    }
  }, [documentId, flashConflictNotice]);

  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  const handleEditorUpdate = useCallback(() => {
    isDirtyRef.current = true;
    setSaveState('dirty');
    markUserActive();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void performSave();
    }, SAVE_DEBOUNCE_MS);
  }, [markUserActive, performSave]);

  const handleFocusChange = useCallback(
    (focused: boolean) => {
      isFocusedRef.current = focused;
      if (focused) {
        heartbeatPresence(documentId, clientId).catch(() => {});
      } else {
        clearPresence(documentId, clientId).catch(() => {});
      }
    },
    [documentId, clientId]
  );

  const refresh = useCallback(async () => {
    const latest = await getMatchDocument(documentId);
    if (!latest) return;

    setOthersEditing(hasOtherEditors(latest.presence, clientId));

    if (!isTitleFocusedRef.current) {
      setTitle(latest.title);
    }

    const editor = editorRef.current;
    if (
      editor &&
      !isDirtyRef.current &&
      !isSavingRef.current &&
      latest.version > versionRef.current
    ) {
      versionRef.current = latest.version;
      editor.commands.setContent(latest.content as JSONContent, {
        emitUpdate: false,
      });
    }
  }, [documentId, clientId]);

  usePolling(refresh, {
    interval: POLL_INTERVAL_MS,
    enabled: !isUserActive && saveState === 'saved',
  });

  // Presence heartbeat while the editor is focused
  useEffect(() => {
    const interval = setInterval(() => {
      if (isFocusedRef.current) {
        heartbeatPresence(documentId, clientId).catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearPresence(documentId, clientId).catch(() => {});
    };
  }, [documentId, clientId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirtyRef.current || isSavingRef.current) {
        event.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
  }, []);

  const handleTitleCommit = useCallback(async () => {
    const trimmed = title.trim() || 'Untitled match plan';
    setTitle(trimmed);
    try {
      await renameMatchDocument(documentId, trimmed);
    } catch (error) {
      console.error('Failed to rename document:', error);
    }
  }, [documentId, title]);

  const saveStateLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'dirty'
        ? 'Unsaved changes'
        : 'Saved';

  return (
    <main className="min-h-screen">
      <MatchPlannerHeader backHref="/match-planner" backLabel="Back to list">
        <input
          className={clsx(
            'text-foreground min-w-0 flex-1 truncate rounded bg-transparent px-2 py-1',
            'text-base font-semibold focus:ring-2 focus:outline-none',
            'focus:ring-ring hover:bg-surface-elevated transition-colors'
          )}
          value={title}
          onChange={event => setTitle(event.target.value)}
          onFocus={() => {
            isTitleFocusedRef.current = true;
          }}
          onBlur={() => {
            isTitleFocusedRef.current = false;
            void handleTitleCommit();
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          aria-label="Document title"
          data-1p-ignore
          autoComplete="off"
        />
        <span
          className={clsx(
            'shrink-0 text-xs whitespace-nowrap',
            saveState === 'saved'
              ? 'text-foreground-muted'
              : 'text-foreground-secondary'
          )}
        >
          {saveStateLabel}
        </span>
      </MatchPlannerHeader>

      <div className="container mx-auto max-w-3xl px-4 py-4">
        {othersEditing && (
          <div className="mb-3 flex justify-center">
            <PresenceIndicator />
          </div>
        )}

        <DocumentEditor
          documentId={documentId}
          initialContent={initialDocument.content as JSONContent}
          onEditorReady={editor => {
            editorRef.current = editor;
          }}
          onUpdate={handleEditorUpdate}
          onFocusChange={handleFocusChange}
        />
      </div>

      {showConflictNotice && (
        <div
          className={clsx(
            'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2',
            'bg-surface-elevated border-border-elevated border shadow-lg',
            'text-foreground text-sm'
          )}
        >
          Updated by someone else — showing the latest version
        </div>
      )}
    </main>
  );
}
