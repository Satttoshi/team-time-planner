import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const updateAvailabilityStatus = vi.hoisted(() => vi.fn());
const updateBulkAvailabilityStatus = vi.hoisted(() => vi.fn());
vi.mock('@/lib/actions', () => ({
  updateAvailabilityStatus,
  updateBulkAvailabilityStatus,
}));

import { useUpdateQueue } from './useUpdateQueue';

let pending: Set<string>;
let bulkPending: Set<number>;

const options = {
  onPendingUpdatesChange: (updater: (prev: Set<string>) => Set<string>) => {
    pending = updater(pending);
  },
  onBulkPendingPlayersChange: (updater: (prev: Set<number>) => Set<number>) => {
    bulkPending = updater(bulkPending);
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  pending = new Set();
  bulkPending = new Set();
  updateAvailabilityStatus.mockResolvedValue(undefined);
  updateBulkAvailabilityStatus.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('queueUpdate', () => {
  it('marks the chip as pending immediately, syncs after the 300ms batch delay', async () => {
    const { result } = renderHook(() => useUpdateQueue(options));

    act(() => result.current.queueUpdate(1, '2026-07-23', '19', 'ready'));

    expect(pending.has('1-19')).toBe(true);
    expect(updateAvailabilityStatus).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(updateAvailabilityStatus).toHaveBeenCalledWith(
      1,
      '2026-07-23',
      '19',
      'ready'
    );
    expect(pending.has('1-19')).toBe(false); // cleared on success
  });

  it('deduplicates rapid clicks on the same chip: only the last status is sent', async () => {
    const { result } = renderHook(() => useUpdateQueue(options));

    act(() => {
      result.current.queueUpdate(1, '2026-07-23', '19', 'ready');
      result.current.queueUpdate(1, '2026-07-23', '19', 'uncertain');
      result.current.queueUpdate(1, '2026-07-23', '19', 'unready');
    });

    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(updateAvailabilityStatus).toHaveBeenCalledTimes(1);
    expect(updateAvailabilityStatus).toHaveBeenCalledWith(
      1,
      '2026-07-23',
      '19',
      'unready'
    );
  });

  it('sends separate updates for different chips in one batch', async () => {
    const { result } = renderHook(() => useUpdateQueue(options));

    act(() => {
      result.current.queueUpdate(1, '2026-07-23', '19', 'ready');
      result.current.queueUpdate(2, '2026-07-23', '20', 'unready');
    });

    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(updateAvailabilityStatus).toHaveBeenCalledTimes(2);
  });

  it('keeps the chip pending when the server update fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    updateAvailabilityStatus.mockRejectedValueOnce(new Error('db down'));
    const { result } = renderHook(() => useUpdateQueue(options));

    act(() => result.current.queueUpdate(1, '2026-07-23', '19', 'ready'));
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(pending.has('1-19')).toBe(true);
    expect(consoleError).toHaveBeenCalled();
  });

  it('processes updates queued while a batch is in flight', async () => {
    let resolveFirst!: () => void;
    updateAvailabilityStatus.mockImplementationOnce(
      () => new Promise<void>(resolve => (resolveFirst = resolve))
    );
    const { result } = renderHook(() => useUpdateQueue(options));

    act(() => result.current.queueUpdate(1, '2026-07-23', '19', 'ready'));
    await act(() => vi.advanceTimersByTimeAsync(300)); // first batch starts (unresolved)

    // Queue another update while the first is still in flight
    act(() => result.current.queueUpdate(2, '2026-07-23', '20', 'unready'));

    resolveFirst();
    await act(() => vi.advanceTimersByTimeAsync(400)); // retry delay (100ms) + batch delay

    expect(updateAvailabilityStatus).toHaveBeenCalledWith(
      2,
      '2026-07-23',
      '20',
      'unready'
    );
  });
});

describe('queueBulkUpdate', () => {
  it('marks the player as bulk-pending and syncs the whole column', async () => {
    const { result } = renderHook(() => useUpdateQueue(options));

    act(() =>
      result.current.queueBulkUpdate(1, '2026-07-23', ['19', '20'], 'ready')
    );

    expect(bulkPending.has(1)).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(updateBulkAvailabilityStatus).toHaveBeenCalledWith(
      1,
      '2026-07-23',
      ['19', '20'],
      'ready'
    );
    expect(bulkPending.has(1)).toBe(false);
  });

  it('clears individual pending keys covered by the bulk update', async () => {
    const { result } = renderHook(() => useUpdateQueue(options));

    pending = new Set(['1-19', '1-20', '2-19']);
    act(() =>
      result.current.queueBulkUpdate(1, '2026-07-23', ['19', '20'], 'ready')
    );
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(pending.has('1-19')).toBe(false);
    expect(pending.has('1-20')).toBe(false);
    expect(pending.has('2-19')).toBe(true); // other player untouched
  });

  it('keeps the player bulk-pending when the bulk update fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    updateBulkAvailabilityStatus.mockRejectedValueOnce(new Error('db down'));
    const { result } = renderHook(() => useUpdateQueue(options));

    act(() =>
      result.current.queueBulkUpdate(1, '2026-07-23', ['19'], 'ready')
    );
    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(bulkPending.has(1)).toBe(true);
  });
});
