import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePolling } from './usePolling';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('usePolling', () => {
  it('runs the callback immediately and then on every interval', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePolling(callback, { interval: 3000 }));

    expect(callback).toHaveBeenCalledTimes(1); // immediate tick

    await vi.advanceTimersByTimeAsync(3000);
    expect(callback).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(6000);
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it('does not poll when disabled', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePolling(callback, { enabled: false }));

    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('stops polling when enabled flips to false (user starts editing)', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ enabled }) => usePolling(callback, { interval: 3000, enabled }),
      { initialProps: { enabled: true } }
    );

    await vi.advanceTimersByTimeAsync(3000);
    const callsWhileEnabled = callback.mock.calls.length;

    rerender({ enabled: false });
    await vi.advanceTimersByTimeAsync(9000);

    expect(callback).toHaveBeenCalledTimes(callsWhileEnabled);
  });

  it('resumes polling when enabled flips back to true', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ enabled }) => usePolling(callback, { interval: 3000, enabled }),
      { initialProps: { enabled: false } }
    );

    expect(callback).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('keeps polling even when a tick fails', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const callback = vi.fn().mockRejectedValue(new Error('network down'));
    renderHook(() => usePolling(callback, { interval: 3000 }));

    await vi.advanceTimersByTimeAsync(6000);

    expect(callback).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith(
      'Polling error:',
      expect.any(Error)
    );
  });

  it('uses the latest callback without restarting the interval', async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ cb }) => usePolling(cb, { interval: 3000 }),
      { initialProps: { cb: first } }
    );

    rerender({ cb: second });
    await vi.advanceTimersByTimeAsync(3000);

    expect(second).toHaveBeenCalled();
  });

  it('cleans up the interval on unmount', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => usePolling(callback, { interval: 3000 }));

    unmount();
    await vi.advanceTimersByTimeAsync(9000);

    expect(callback).toHaveBeenCalledTimes(1); // only the immediate tick
  });
});
