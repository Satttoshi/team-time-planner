import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chain, type ChainCall } from '@/test-utils/mockDb';

const db = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/db', async () => {
  const schema =
    await vi.importActual<typeof import('@/lib/db/schema')>('@/lib/db/schema');
  return { ...schema, db };
});

const blobList = vi.hoisted(() => vi.fn());
const blobDel = vi.hoisted(() => vi.fn());
vi.mock('@vercel/blob', () => ({ list: blobList, del: blobDel }));

import {
  getMatchDocuments,
  createMatchDocument,
  updateMatchDocumentDetails,
  renameMatchDocument,
  deleteMatchDocument,
  cleanupOrphanedBlobs,
  getMatchDocument,
  saveMatchDocument,
  heartbeatPresence,
  clearPresence,
} from './document-actions';

const makeDocument = (overrides: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  title: 'vs Rivals',
  content: {},
  matchDate: new Date('2026-07-25T18:00:00Z'),
  version: 1,
  presence: {},
  createdAt: new Date('2026-07-01T00:00:00Z'),
  updatedAt: new Date('2026-07-01T00:00:00Z'),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.select.mockImplementation(() => chain([]));
  db.insert.mockImplementation(() => chain([]));
  db.update.mockImplementation(() => chain([]));
  db.delete.mockImplementation(() => chain([]));
  blobList.mockResolvedValue({ blobs: [] });
  blobDel.mockResolvedValue(undefined);
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getMatchDocuments', () => {
  it('returns the document list ordered by match date', async () => {
    const listRow = {
      id: 'doc-1',
      title: 'vs Rivals',
      matchDate: new Date('2026-07-25T18:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    };
    db.select
      .mockReturnValueOnce(chain([])) // purge query: nothing expired
      .mockReturnValueOnce(chain([listRow]));

    await expect(getMatchDocuments()).resolves.toEqual([listRow]);
  });

  it('purges documents whose match date is older than 3 months', async () => {
    db.select
      .mockReturnValueOnce(chain([{ id: 'old-doc' }])) // purge query
      .mockReturnValueOnce(chain([])); // list query

    await getMatchDocuments();

    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('still returns the list when purging fails', async () => {
    db.select
      .mockImplementationOnce(() => {
        throw new Error('purge failed');
      })
      .mockImplementationOnce(() => chain([]));

    await expect(getMatchDocuments()).resolves.toEqual([]);
  });
});

describe('createMatchDocument', () => {
  it('returns the new document id', async () => {
    const calls: ChainCall[] = [];
    db.insert.mockReturnValueOnce(chain([{ id: 'new-doc' }], calls));

    await expect(
      createMatchDocument('Semi final', '2026-08-01T18:00:00Z')
    ).resolves.toBe('new-doc');

    expect(calls).toContainEqual({
      method: 'values',
      args: [
        { title: 'Semi final', matchDate: new Date('2026-08-01T18:00:00Z') },
      ],
    });
  });

  it('falls back to database defaults when title and date are omitted', async () => {
    const calls: ChainCall[] = [];
    db.insert.mockReturnValueOnce(chain([{ id: 'new-doc' }], calls));

    await createMatchDocument();

    expect(calls).toContainEqual({ method: 'values', args: [{}] });
  });
});

describe('updateMatchDocumentDetails / renameMatchDocument', () => {
  it('updates title and match date', async () => {
    await updateMatchDocumentDetails(
      'doc-1',
      'New title',
      '2026-08-01T18:00:00Z'
    );
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('renames a document', async () => {
    await renameMatchDocument('doc-1', 'Renamed');
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('wraps database errors', async () => {
    db.update.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(renameMatchDocument('doc-1', 'x')).rejects.toThrow(
      'Failed to rename match document'
    );
  });
});

describe('deleteMatchDocument', () => {
  it('deletes the row and skips blob cleanup when Blob is not configured', async () => {
    await deleteMatchDocument('doc-1');

    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(blobList).not.toHaveBeenCalled();
  });

  it('deletes the uploaded blobs when Blob is configured', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'token');
    blobList.mockResolvedValueOnce({
      blobs: [{ url: 'https://blob/a.png' }, { url: 'https://blob/b.png' }],
    });

    await deleteMatchDocument('doc-1');

    expect(blobList).toHaveBeenCalledWith({ prefix: 'match-docs/doc-1/' });
    expect(blobDel).toHaveBeenCalledWith([
      'https://blob/a.png',
      'https://blob/b.png',
    ]);
  });

  it('treats blob cleanup as best-effort and swallows its errors', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'token');
    blobList.mockRejectedValueOnce(new Error('blob outage'));

    await expect(deleteMatchDocument('doc-1')).resolves.toBeUndefined();
  });
});

describe('cleanupOrphanedBlobs', () => {
  const image = (src: string) => ({ type: 'image', attrs: { src } });

  it('does nothing when Blob is not configured', async () => {
    await cleanupOrphanedBlobs('doc-1');
    expect(blobList).not.toHaveBeenCalled();
  });

  it('deletes old blobs that are no longer referenced in the document', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'token');
    const referencedPath = 'match-docs/doc-1/kept.png';
    const document = makeDocument({
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [] },
          image(`https://blob/kept.png?pathname=${referencedPath}`),
        ],
      },
    });
    db.select.mockReturnValueOnce(chain([document]));

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const justNow = new Date();
    blobList.mockResolvedValueOnce({
      blobs: [
        {
          pathname: referencedPath,
          url: 'https://blob/kept.png',
          uploadedAt: twoHoursAgo,
        },
        {
          pathname: 'match-docs/doc-1/orphan-old.png',
          url: 'https://blob/orphan-old.png',
          uploadedAt: twoHoursAgo,
        },
        {
          pathname: 'match-docs/doc-1/orphan-fresh.png',
          url: 'https://blob/orphan-fresh.png',
          uploadedAt: justNow,
        },
      ],
    });

    await cleanupOrphanedBlobs('doc-1');

    // Only the old orphan is removed: the referenced blob stays, and blobs
    // younger than an hour are protected for in-flight uploads/undo.
    expect(blobDel).toHaveBeenCalledWith(['https://blob/orphan-old.png']);
  });

  it('does nothing when the document no longer exists', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'token');
    db.select.mockReturnValueOnce(chain([]));

    await cleanupOrphanedBlobs('missing');

    expect(blobList).not.toHaveBeenCalled();
    expect(blobDel).not.toHaveBeenCalled();
  });
});

describe('getMatchDocument', () => {
  it('returns the document when found', async () => {
    const document = makeDocument();
    db.select.mockReturnValueOnce(chain([document]));
    await expect(getMatchDocument('doc-1')).resolves.toEqual(document);
  });

  it('returns null when not found', async () => {
    db.select.mockReturnValueOnce(chain([]));
    await expect(getMatchDocument('missing')).resolves.toBeNull();
  });
});

describe('saveMatchDocument (optimistic concurrency)', () => {
  it('saves and returns the incremented version when the base version matches', async () => {
    db.update.mockReturnValueOnce(chain([{ version: 5 }]));

    await expect(
      saveMatchDocument('doc-1', { type: 'doc' }, 4)
    ).resolves.toEqual({
      conflict: false,
      version: 5,
    });
  });

  it('reports a conflict with the latest document when the version is stale', async () => {
    const latest = makeDocument({ version: 7 });
    db.update.mockReturnValueOnce(chain([])); // no row matched baseVersion
    db.select.mockReturnValueOnce(chain([latest]));

    await expect(
      saveMatchDocument('doc-1', { type: 'doc' }, 4)
    ).resolves.toEqual({
      conflict: true,
      latest,
    });
  });

  it('throws when the conflicting document has been deleted', async () => {
    db.update.mockReturnValueOnce(chain([]));
    db.select.mockReturnValueOnce(chain([]));

    await expect(saveMatchDocument('doc-1', {}, 4)).rejects.toThrow(
      'Failed to save match document'
    );
  });
});

describe('presence', () => {
  it('heartbeatPresence updates the presence map', async () => {
    await heartbeatPresence('doc-1', 'client-a');
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('clearPresence removes the client entry', async () => {
    await clearPresence('doc-1', 'client-a');
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('wraps database errors', async () => {
    db.update.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(heartbeatPresence('doc-1', 'client-a')).rejects.toThrow(
      'Failed to update presence'
    );
  });
});
