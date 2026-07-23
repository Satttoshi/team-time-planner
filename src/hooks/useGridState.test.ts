import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridState } from './useGridState';

const DEFAULT_HOURS = ['19', '20', '21', '22', '23'];
const ALL_EARLY_HOURS = ['10', '11', '12', '13', '14', '15', '16', '17', '18'];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('handleAddEarlyHour', () => {
  it('adds the latest missing early hour first (18, then 17, ...)', () => {
    const { result } = renderHook(() => useGridState());

    act(() => result.current.handleAddEarlyHour(DEFAULT_HOURS));
    expect(result.current.additionalHours).toEqual(['18']);

    act(() => result.current.handleAddEarlyHour(['18', ...DEFAULT_HOURS]));
    expect(result.current.additionalHours).toEqual(['18', '17']);
  });

  it('does nothing when all early hours are already shown', () => {
    const { result } = renderHook(() => useGridState());

    act(() =>
      result.current.handleAddEarlyHour([...ALL_EARLY_HOURS, ...DEFAULT_HOURS])
    );
    expect(result.current.additionalHours).toEqual([]);
  });
});

describe('canAddEarlyHour', () => {
  it('is true while early hours remain', () => {
    const { result } = renderHook(() => useGridState());
    expect(result.current.canAddEarlyHour(DEFAULT_HOURS)).toBe(true);
    expect(result.current.canAddEarlyHour(['18', ...DEFAULT_HOURS])).toBe(true);
  });

  it('is false once every early hour is shown', () => {
    const { result } = renderHook(() => useGridState());
    expect(
      result.current.canAddEarlyHour([...ALL_EARLY_HOURS, ...DEFAULT_HOURS])
    ).toBe(false);
  });
});

describe('setUserActive', () => {
  it('marks the user active and notifies the parent', () => {
    const onUserActivity = vi.fn();
    const { result } = renderHook(() => useGridState({ onUserActivity }));

    act(() => result.current.setUserActive(true));

    expect(result.current.userActiveRef.current).toBe(true);
    expect(onUserActivity).toHaveBeenCalledWith(true);
  });

  it('automatically deactivates after 2 seconds of inactivity', () => {
    const onUserActivity = vi.fn();
    const { result } = renderHook(() => useGridState({ onUserActivity }));

    act(() => result.current.setUserActive(true));
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.userActiveRef.current).toBe(false);
    expect(onUserActivity).toHaveBeenLastCalledWith(false);
  });

  it('extends the timeout on repeated activity (rapid clicking)', () => {
    const onUserActivity = vi.fn();
    const { result } = renderHook(() => useGridState({ onUserActivity }));

    act(() => result.current.setUserActive(true));
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.setUserActive(true)); // click again before timeout
    act(() => vi.advanceTimersByTime(1500));

    // 3s since first click, but only 1.5s since last -> still active
    expect(result.current.userActiveRef.current).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.userActiveRef.current).toBe(false);
  });

  it('deactivates immediately and cancels the timeout when set inactive', () => {
    const onUserActivity = vi.fn();
    const { result } = renderHook(() => useGridState({ onUserActivity }));

    act(() => result.current.setUserActive(true));
    act(() => result.current.setUserActive(false));

    expect(result.current.userActiveRef.current).toBe(false);
    expect(onUserActivity).toHaveBeenLastCalledWith(false);
    expect(result.current.activityTimeoutRef.current).toBeNull();
  });
});

describe('clearState', () => {
  it('resets hours, pending sets and activity', () => {
    const onUserActivity = vi.fn();
    const { result } = renderHook(() => useGridState({ onUserActivity }));

    act(() => {
      result.current.handleAddEarlyHour(DEFAULT_HOURS);
      result.current.setPendingUpdates(new Set(['1-19']));
      result.current.setBulkPendingPlayers(new Set([1]));
      result.current.setUserActive(true);
    });

    act(() => result.current.clearState());

    expect(result.current.additionalHours).toEqual([]);
    expect(result.current.pendingUpdates.size).toBe(0);
    expect(result.current.bulkPendingPlayers.size).toBe(0);
    expect(result.current.userActiveRef.current).toBe(false);
    expect(onUserActivity).toHaveBeenLastCalledWith(false);
  });
});
