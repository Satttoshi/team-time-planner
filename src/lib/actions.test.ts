import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chain, type ChainCall } from '@/test-utils/mockDb';
import { makePlayer } from '@/test-utils/factories';

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

import {
  getPlayers,
  createPlayer,
  getAvailabilityForDates,
  updateAvailabilityStatus,
  updateBulkAvailabilityStatus,
  seedPlayersIfNeeded,
  getPlayerAvailabilityForDate,
  getAllPlayerAvailabilityForDates,
  updatePlayerSortOrder,
  deleteDayData,
  updatePlayerDetails,
  togglePlayerActiveStatus,
  deletePlayer,
  addNewPlayer,
} from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  db.select.mockImplementation(() => chain([]));
  db.insert.mockImplementation(() => chain([]));
  db.update.mockImplementation(() => chain([]));
  db.delete.mockImplementation(() => chain([]));
});

describe('getPlayers', () => {
  it('returns all players ordered by sort order', async () => {
    const rows = [makePlayer({ id: 1 }), makePlayer({ id: 2 })];
    const calls: ChainCall[] = [];
    db.select.mockReturnValueOnce(chain(rows, calls));

    await expect(getPlayers()).resolves.toEqual(rows);
    expect(calls.map(c => c.method)).toEqual(['from', 'orderBy']);
  });

  it('filters to active players when activeOnly is set', async () => {
    const calls: ChainCall[] = [];
    db.select.mockReturnValueOnce(chain([], calls));

    await getPlayers(true);
    expect(calls.map(c => c.method)).toEqual(['from', 'where', 'orderBy']);
  });

  it('wraps database errors', async () => {
    db.select.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(getPlayers()).rejects.toThrow('Failed to fetch players');
  });
});

describe('createPlayer', () => {
  it('inserts and returns the new player', async () => {
    const player = makePlayer({ name: 'Neo' });
    const calls: ChainCall[] = [];
    db.insert.mockReturnValueOnce(chain([player], calls));

    await expect(createPlayer('Neo')).resolves.toEqual(player);
    expect(calls).toContainEqual({ method: 'values', args: [{ name: 'Neo' }] });
  });
});

describe('getAvailabilityForDates', () => {
  it('returns availability rows for the given dates', async () => {
    const rows = [{ id: 1, playerId: 1, date: '2026-07-23', hours: {} }];
    db.select.mockReturnValueOnce(chain(rows));

    await expect(getAvailabilityForDates(['2026-07-23'])).resolves.toEqual(
      rows
    );
  });

  it('wraps database errors', async () => {
    db.select.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(getAvailabilityForDates([])).rejects.toThrow(
      'Failed to fetch availability'
    );
  });
});

describe('updateAvailabilityStatus', () => {
  it('updates the existing record atomically when one exists', async () => {
    db.select.mockReturnValueOnce(chain([{ id: 42 }]));

    await updateAvailabilityStatus(1, '2026-07-23', '19', 'ready');

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('creates a new record when none exists', async () => {
    db.select.mockReturnValueOnce(chain([]));
    const calls: ChainCall[] = [];
    db.insert.mockReturnValueOnce(chain([], calls));

    await updateAvailabilityStatus(1, '2026-07-23', '19', 'ready');

    expect(db.update).not.toHaveBeenCalled();
    expect(calls).toContainEqual({
      method: 'values',
      args: [{ playerId: 1, date: '2026-07-23', hours: { '19': 'ready' } }],
    });
  });

  it('wraps database errors', async () => {
    db.select.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      updateAvailabilityStatus(1, '2026-07-23', '19', 'ready')
    ).rejects.toThrow('Failed to update availability status');
  });
});

describe('updateBulkAvailabilityStatus', () => {
  it('merges all hours into the existing record', async () => {
    db.select.mockReturnValueOnce(chain([{ id: 42, hours: {} }]));

    await updateBulkAvailabilityStatus(
      1,
      '2026-07-23',
      ['19', '20'],
      'unready'
    );

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('creates a record with all hours set when none exists', async () => {
    db.select.mockReturnValueOnce(chain([]));
    const calls: ChainCall[] = [];
    db.insert.mockReturnValueOnce(chain([], calls));

    await updateBulkAvailabilityStatus(1, '2026-07-23', ['19', '20'], 'ready');

    expect(calls).toContainEqual({
      method: 'values',
      args: [
        {
          playerId: 1,
          date: '2026-07-23',
          hours: { '19': 'ready', '20': 'ready' },
        },
      ],
    });
  });
});

describe('seedPlayersIfNeeded', () => {
  it('seeds the six default players when the table is empty', async () => {
    db.select.mockReturnValueOnce(chain([]));

    await seedPlayersIfNeeded();

    expect(db.insert).toHaveBeenCalledTimes(6);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('only updates roles when players already exist', async () => {
    db.select.mockReturnValueOnce(chain([makePlayer()]));

    await seedPlayersIfNeeded();

    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(6);
  });
});

describe('getPlayerAvailabilityForDate', () => {
  it('pairs each active player with their availability, defaulting to empty', async () => {
    const p1 = makePlayer({ id: 1 });
    const p2 = makePlayer({ id: 2 });
    // First select: players; second select: availability records
    db.select
      .mockReturnValueOnce(chain([p1, p2]))
      .mockReturnValueOnce(
        chain([
          { id: 10, playerId: 1, date: '2026-07-23', hours: { '19': 'ready' } },
        ])
      );

    const result = await getPlayerAvailabilityForDate('2026-07-23');

    expect(result).toEqual([
      { player: p1, availability: { '19': 'ready' } },
      { player: p2, availability: {} },
    ]);
  });
});

describe('getAllPlayerAvailabilityForDates', () => {
  it('groups availability per requested date', async () => {
    const p1 = makePlayer({ id: 1 });
    db.select
      .mockReturnValueOnce(chain([p1])) // players
      .mockReturnValueOnce(
        chain([
          {
            id: 10,
            playerId: 1,
            date: '2026-07-23',
            hours: { '20': 'uncertain' },
          },
        ])
      ); // availability for dates

    const result = await getAllPlayerAvailabilityForDates([
      '2026-07-23',
      '2026-07-24',
    ]);

    expect(result['2026-07-23']).toEqual([
      { player: p1, availability: { '20': 'uncertain' } },
    ]);
    expect(result['2026-07-24']).toEqual([{ player: p1, availability: {} }]);
  });
});

describe('updatePlayerSortOrder', () => {
  it('updates every player with its position-based sort order', async () => {
    await updatePlayerSortOrder([7, 3, 9]);
    expect(db.update).toHaveBeenCalledTimes(3);
  });

  it('wraps database errors', async () => {
    db.update.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(updatePlayerSortOrder([1])).rejects.toThrow(
      'Failed to update player sort order'
    );
  });
});

describe('deleteDayData', () => {
  it('deletes availability rows for the date', async () => {
    await deleteDayData('2026-07-23');
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('wraps database errors', async () => {
    db.delete.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(deleteDayData('2026-07-23')).rejects.toThrow(
      'Failed to delete day data'
    );
  });
});

describe('updatePlayerDetails', () => {
  it('updates name and role', async () => {
    const calls: ChainCall[] = [];
    db.update.mockReturnValueOnce(chain([], calls));

    await updatePlayerDetails(1, 'Renamed', 'coach');

    expect(calls).toContainEqual({
      method: 'set',
      args: [{ name: 'Renamed', role: 'coach' }],
    });
  });
});

describe('togglePlayerActiveStatus', () => {
  it('refuses to activate a 7th player', async () => {
    db.select.mockReturnValueOnce(
      chain([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }])
    );

    await expect(togglePlayerActiveStatus(7, true)).rejects.toThrow(
      'Maximum of 6 active players allowed'
    );
    expect(db.update).not.toHaveBeenCalled();
  });

  it('activates a player when under the limit', async () => {
    db.select.mockReturnValueOnce(chain([{ id: 1 }]));
    const calls: ChainCall[] = [];
    db.update.mockReturnValueOnce(chain([], calls));

    await togglePlayerActiveStatus(2, true);

    expect(calls).toContainEqual({ method: 'set', args: [{ isActive: 1 }] });
  });

  it('deactivates without checking the active-player limit', async () => {
    const calls: ChainCall[] = [];
    db.update.mockReturnValueOnce(chain([], calls));

    await togglePlayerActiveStatus(2, false);

    expect(db.select).not.toHaveBeenCalled();
    expect(calls).toContainEqual({ method: 'set', args: [{ isActive: 0 }] });
  });
});

describe('deletePlayer', () => {
  it('deletes the player row', async () => {
    await deletePlayer(3);
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it('wraps database errors', async () => {
    db.delete.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(deletePlayer(3)).rejects.toThrow('Failed to delete player');
  });
});

describe('addNewPlayer', () => {
  it('appends after the highest sort order and starts inactive', async () => {
    db.select.mockReturnValueOnce(
      chain([makePlayer({ sortOrder: 2 }), makePlayer({ sortOrder: 5 })])
    );
    const created = makePlayer({ name: 'Newbie', isActive: 0, sortOrder: 6 });
    const calls: ChainCall[] = [];
    db.insert.mockReturnValueOnce(chain([created], calls));

    await expect(addNewPlayer('Newbie')).resolves.toEqual(created);

    expect(calls).toContainEqual({
      method: 'values',
      args: [{ name: 'Newbie', role: 'player', sortOrder: 6, isActive: 0 }],
    });
  });

  it('starts at sort order 1 when there are no players', async () => {
    db.select.mockReturnValueOnce(chain([]));
    const calls: ChainCall[] = [];
    db.insert.mockReturnValueOnce(chain([makePlayer()], calls));

    await addNewPlayer('First', 'coach');

    expect(calls).toContainEqual({
      method: 'values',
      args: [{ name: 'First', role: 'coach', sortOrder: 1, isActive: 0 }],
    });
  });
});
