'use server';

import { db, matchDocuments, type MatchDocument } from './db';
import type { JSONContent } from '@tiptap/react';
import { and, asc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { del, list } from '@vercel/blob';

export interface MatchDocumentListItem {
  id: string;
  title: string;
  matchDate: Date;
  updatedAt: Date;
}

export type SaveDocumentResult =
  | { conflict: false; version: number }
  | { conflict: true; latest: MatchDocument };

// Documents (and their uploaded blobs) are kept for 3 months after the
// match date, then removed on the next list fetch.
async function purgeExpiredMatchDocuments(): Promise<void> {
  try {
    const expired = await db
      .select({ id: matchDocuments.id })
      .from(matchDocuments)
      .where(sql`${matchDocuments.matchDate} < now() - interval '3 months'`);

    await Promise.all(expired.map(({ id }) => deleteMatchDocument(id)));
  } catch (error) {
    console.error('Error purging expired match documents:', error);
  }
}

export async function getMatchDocuments(): Promise<MatchDocumentListItem[]> {
  await purgeExpiredMatchDocuments();

  try {
    return await db
      .select({
        id: matchDocuments.id,
        title: matchDocuments.title,
        matchDate: matchDocuments.matchDate,
        updatedAt: matchDocuments.updatedAt,
      })
      .from(matchDocuments)
      .orderBy(asc(matchDocuments.matchDate));
  } catch (error) {
    console.error('Error fetching match documents:', error);
    throw new Error('Failed to fetch match documents');
  }
}

export async function createMatchDocument(
  title?: string,
  matchDateIso?: string
): Promise<string> {
  try {
    const [document] = await db
      .insert(matchDocuments)
      .values({
        ...(title ? { title } : {}),
        ...(matchDateIso ? { matchDate: new Date(matchDateIso) } : {}),
      })
      .returning({ id: matchDocuments.id });
    return document.id;
  } catch (error) {
    console.error('Error creating match document:', error);
    throw new Error('Failed to create match document');
  }
}

export async function updateMatchDocumentDetails(
  id: string,
  title: string,
  matchDateIso: string
): Promise<void> {
  try {
    await db
      .update(matchDocuments)
      .set({
        title,
        matchDate: new Date(matchDateIso),
        updatedAt: sql`now()`,
      })
      .where(eq(matchDocuments.id, id));
  } catch (error) {
    console.error('Error updating match document details:', error);
    throw new Error('Failed to update match document details');
  }
}

export async function renameMatchDocument(
  id: string,
  title: string
): Promise<void> {
  try {
    await db
      .update(matchDocuments)
      .set({ title, updatedAt: sql`now()` })
      .where(eq(matchDocuments.id, id));
  } catch (error) {
    console.error('Error renaming match document:', error);
    throw new Error('Failed to rename match document');
  }
}

export async function deleteMatchDocument(id: string): Promise<void> {
  try {
    await db.delete(matchDocuments).where(eq(matchDocuments.id, id));
  } catch (error) {
    console.error('Error deleting match document:', error);
    throw new Error('Failed to delete match document');
  }

  // Best-effort cleanup of uploaded images (skipped when Blob is not configured)
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { blobs } = await list({ prefix: `match-docs/${id}/` });
      if (blobs.length > 0) {
        await del(blobs.map(blob => blob.url));
      }
    }
  } catch (error) {
    console.error('Error deleting match document images:', error);
  }
}

// Images removed from a document leave their blobs behind — collect the
// pathnames still referenced in the content and delete the rest. Blobs
// younger than an hour are kept so in-flight uploads and recent undos
// are never destroyed.
const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

function collectReferencedBlobPathnames(content: JSONContent): Set<string> {
  const pathnames = new Set<string>();

  const walk = (node: JSONContent): void => {
    const src: unknown = node.attrs?.src;

    if (node.type === 'image' && typeof src === 'string') {
      const pathname = new URLSearchParams(src.split('?')[1] ?? '').get(
        'pathname'
      );
      if (pathname) pathnames.add(pathname);
    }

    node.content?.forEach(walk);
  };

  walk(content);
  return pathnames;
}

export async function cleanupOrphanedBlobs(id: string): Promise<void> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return;

    const document = await getMatchDocument(id);
    if (!document) return;

    const referenced = collectReferencedBlobPathnames(document.content);
    const { blobs } = await list({ prefix: `match-docs/${id}/` });
    const now = Date.now();

    const orphaned = blobs.filter(
      blob =>
        !referenced.has(blob.pathname) &&
        now - new Date(blob.uploadedAt).getTime() > ORPHAN_MIN_AGE_MS
    );

    if (orphaned.length > 0) {
      await del(orphaned.map(blob => blob.url));
    }
  } catch (error) {
    console.error('Error cleaning up orphaned blobs:', error);
  }
}

export async function getMatchDocument(
  id: string
): Promise<MatchDocument | null> {
  try {
    const [document] = await db
      .select()
      .from(matchDocuments)
      .where(eq(matchDocuments.id, id));
    return document ?? null;
  } catch (error) {
    console.error('Error fetching match document:', error);
    throw new Error('Failed to fetch match document');
  }
}

export async function saveMatchDocument(
  id: string,
  content: JSONContent,
  baseVersion: number
): Promise<SaveDocumentResult> {
  try {
    const updated = await db
      .update(matchDocuments)
      .set({
        content,
        version: sql`version + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(matchDocuments.id, id), eq(matchDocuments.version, baseVersion))
      )
      .returning({ version: matchDocuments.version });

    if (updated.length === 0) {
      const latest = await getMatchDocument(id);
      if (!latest) {
        throw new Error('Document not found');
      }
      return { conflict: true, latest };
    }

    return { conflict: false, version: updated[0].version };
  } catch (error) {
    console.error('Error saving match document:', error);
    throw new Error('Failed to save match document');
  }
}

export async function heartbeatPresence(
  id: string,
  clientId: string
): Promise<void> {
  try {
    await db
      .update(matchDocuments)
      .set({
        presence: sql`presence || ${JSON.stringify({
          [clientId]: new Date().toISOString(),
        })}::jsonb`,
      })
      .where(eq(matchDocuments.id, id));
  } catch (error) {
    console.error('Error updating presence:', error);
    throw new Error('Failed to update presence');
  }
}

export async function clearPresence(
  id: string,
  clientId: string
): Promise<void> {
  try {
    await db
      .update(matchDocuments)
      .set({ presence: sql`presence - ${clientId}` })
      .where(eq(matchDocuments.id, id));
  } catch (error) {
    console.error('Error clearing presence:', error);
    throw new Error('Failed to clear presence');
  }
}
