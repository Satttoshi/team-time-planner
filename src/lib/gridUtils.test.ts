import { describe, it, expect } from 'vitest';
import { getAllHours, getStatus, getBulkStatus } from './gridUtils';
import { makePlayerAvailability } from '@/test-utils/factories';

describe('getAllHours', () => {
  it('returns the default evening hours when there is no data', () => {
    expect(getAllHours([], [])).toEqual(['19', '20', '21', '22', '23']);
  });

  it('merges additional hours ahead of the defaults, sorted numerically', () => {
    expect(getAllHours(['18', '17'], [])).toEqual([
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
    ]);
  });

  it('includes hours that only exist in player availability data', () => {
    const pa = makePlayerAvailability({ id: 1 }, { '16': 'ready' });
    expect(getAllHours([], [pa])).toContain('16');
  });

  it('deduplicates hours present in multiple sources', () => {
    const pa = makePlayerAvailability({ id: 1 }, { '19': 'ready' });
    const hours = getAllHours(['19'], [pa]);
    expect(hours.filter(h => h === '19')).toHaveLength(1);
  });

  it('sorts single-digit hours numerically, not lexically', () => {
    const pa = makePlayerAvailability({ id: 1 }, { '9': 'ready' });
    expect(getAllHours(['10'], [pa]).slice(0, 2)).toEqual(['9', '10']);
  });
});

describe('getStatus', () => {
  const server = [makePlayerAvailability({ id: 1 }, { '19': 'ready' })];

  it('prefers the optimistic status over server data', () => {
    expect(getStatus(1, '19', { '1-19': 'unready' }, server)).toBe('unready');
  });

  it('falls back to server data when there is no optimistic update', () => {
    expect(getStatus(1, '19', {}, server)).toBe('ready');
  });

  it('returns "unknown" when neither optimistic nor server data exists', () => {
    expect(getStatus(1, '20', {}, server)).toBe('unknown');
    expect(getStatus(99, '19', {}, server)).toBe('unknown');
  });
});

describe('getBulkStatus', () => {
  it('returns the most frequent status across all hours', () => {
    const pa = makePlayerAvailability(
      { id: 1 },
      { '19': 'ready', '20': 'ready', '21': 'unready' }
    );
    expect(getBulkStatus(1, ['19', '20', '21'], {}, [pa])).toBe('ready');
  });

  it('counts optimistic updates when tallying', () => {
    const pa = makePlayerAvailability({ id: 1 }, { '19': 'ready' });
    const optimistic = {
      '1-20': 'unready' as const,
      '1-21': 'unready' as const,
    };
    expect(getBulkStatus(1, ['19', '20', '21'], optimistic, [pa])).toBe(
      'unready'
    );
  });

  it('returns "unknown" for a player without any data', () => {
    expect(getBulkStatus(1, ['19', '20'], {}, [])).toBe('unknown');
  });

  it('returns "unknown" when there are no hours to evaluate', () => {
    const pa = makePlayerAvailability({ id: 1 }, { '19': 'ready' });
    expect(getBulkStatus(1, [], {}, [pa])).toBe('unknown');
  });

  it('prefers the first-counted status on a tie (ready beats unready)', () => {
    const pa = makePlayerAvailability(
      { id: 1 },
      { '19': 'ready', '20': 'unready' }
    );
    expect(getBulkStatus(1, ['19', '20'], {}, [pa])).toBe('ready');
  });
});
