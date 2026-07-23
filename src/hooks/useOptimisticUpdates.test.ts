import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { makePlayerAvailability } from '@/test-utils/factories';
import { type PlayerAvailability } from '@/lib/actions';

interface HookProps {
  playerAvailabilities: PlayerAvailability[];
  pendingUpdates?: Set<string>;
  bulkPendingPlayers?: Set<number>;
  userActive?: boolean;
  onUserActivity?: (isActive: boolean) => void;
}

function setup(initial: HookProps) {
  const userActiveRef = { current: initial.userActive ?? false };
  const activityTimeoutRef = { current: null as NodeJS.Timeout | null };
  const updateQueueRef = { current: new Map() };
  const bulkUpdateQueueRef = { current: new Map() };

  const rendered = renderHook(
    (props: HookProps) =>
      useOptimisticUpdates({
        playerAvailabilities: props.playerAvailabilities,
        pendingUpdates: props.pendingUpdates ?? new Set(),
        bulkPendingPlayers: props.bulkPendingPlayers ?? new Set(),
        hasHandledDelete: false,
        userActiveRef,
        onUserActivity: props.onUserActivity,
        activityTimeoutRef,
        updateQueueRef,
        bulkUpdateQueueRef,
      }),
    { initialProps: initial }
  );

  return {
    ...rendered,
    userActiveRef,
    activityTimeoutRef,
    updateQueueRef,
    bulkUpdateQueueRef,
  };
}

describe('applyOptimisticUpdate', () => {
  // Server data for an unrelated hour, so neither the reconciliation nor
  // the delete-handling effect interferes with the applied update.
  const server = () => [makePlayerAvailability({ id: 1 }, { '21': 'ready' })];

  it('stores the optimistic status for a single chip', () => {
    const { result } = setup({ playerAvailabilities: server() });

    act(() => result.current.applyOptimisticUpdate('1-19', 'ready'));

    expect(result.current.optimisticData).toEqual({ '1-19': 'ready' });
  });

  it('stores optimistic statuses for a whole player column', () => {
    const { result } = setup({ playerAvailabilities: server() });

    act(() =>
      result.current.applyBulkOptimisticUpdate(1, ['19', '20'], 'unready')
    );

    expect(result.current.optimisticData).toEqual({
      '1-19': 'unready',
      '1-20': 'unready',
    });
  });
});

describe('reconciliation with server data', () => {
  it('keeps the optimistic value while the update is still pending', () => {
    const server = [makePlayerAvailability({ id: 1 }, { '19': 'ready' })];
    const { result, rerender } = setup({
      playerAvailabilities: server,
      pendingUpdates: new Set(['1-19']),
    });

    act(() => result.current.applyOptimisticUpdate('1-19', 'ready'));
    rerender({
      playerAvailabilities: server,
      pendingUpdates: new Set(['1-19']),
    });

    expect(result.current.optimisticData['1-19']).toBe('ready');
  });

  it('clears the optimistic value once the server confirms it', () => {
    const before = [makePlayerAvailability({ id: 1 }, {})];
    const { result, rerender } = setup({
      playerAvailabilities: before,
      pendingUpdates: new Set(['1-19']),
    });

    act(() => result.current.applyOptimisticUpdate('1-19', 'ready'));

    // Server now returns the confirmed value and the update is no longer pending
    rerender({
      playerAvailabilities: [
        makePlayerAvailability({ id: 1 }, { '19': 'ready' }),
      ],
      pendingUpdates: new Set(),
    });

    expect(result.current.optimisticData['1-19']).toBeUndefined();
  });

  it('does NOT let stale server data overwrite a differing optimistic value', () => {
    const server = [makePlayerAvailability({ id: 1 }, { '19': 'unready' })];
    const { result, rerender } = setup({
      playerAvailabilities: server,
      pendingUpdates: new Set(['1-19']),
    });

    act(() => result.current.applyOptimisticUpdate('1-19', 'ready'));
    rerender({
      playerAvailabilities: server,
      pendingUpdates: new Set(['1-19']),
    });

    expect(result.current.optimisticData['1-19']).toBe('ready');
  });
});

describe('day deletion handling', () => {
  it('clears optimistic state and queues when the day is wiped and the user is idle', () => {
    const onUserActivity = vi.fn();
    const withData = [makePlayerAvailability({ id: 1 }, { '19': 'ready' })];
    const { result, rerender, updateQueueRef, bulkUpdateQueueRef } = setup({
      playerAvailabilities: withData,
      onUserActivity,
    });

    // Optimistic value differs from server data so it survives reconciliation
    act(() => result.current.applyOptimisticUpdate('1-19', 'uncertain'));
    updateQueueRef.current.set('1-19', {
      playerId: 1,
      date: '2026-07-23',
      hour: '19',
      status: 'uncertain',
    });

    // Poll returns an empty day (someone deleted the data)
    rerender({
      playerAvailabilities: [makePlayerAvailability({ id: 1 }, {})],
      onUserActivity,
    });

    expect(result.current.optimisticData).toEqual({});
    expect(updateQueueRef.current.size).toBe(0);
    expect(bulkUpdateQueueRef.current.size).toBe(0);
    expect(onUserActivity).toHaveBeenCalledWith(false);
    expect(result.current.hasHandledDelete).toBe(true);
  });

  it('preserves optimistic edits made while the user is actively editing an empty day', () => {
    const empty = [makePlayerAvailability({ id: 1 }, {})];
    const { result, rerender } = setup({
      playerAvailabilities: empty,
      userActive: true,
    });

    act(() => result.current.applyOptimisticUpdate('1-19', 'ready'));
    rerender({ playerAvailabilities: empty, userActive: true });

    expect(result.current.optimisticData['1-19']).toBe('ready');
  });
});
