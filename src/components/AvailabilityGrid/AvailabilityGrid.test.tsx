import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { makePlayerAvailability } from '@/test-utils/factories';

const updateAvailabilityStatus = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);
const updateBulkAvailabilityStatus = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);
vi.mock('@/lib/actions', () => ({
  updateAvailabilityStatus,
  updateBulkAvailabilityStatus,
}));

import { AvailabilityGrid } from './AvailabilityGrid';

const players = [
  makePlayerAvailability({ id: 1, name: 'Josh' }, { '19': 'ready' }),
  makePlayerAvailability({ id: 2, name: 'Toby' }, {}),
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AvailabilityGrid', () => {
  it('renders the default 19:00-23:00 rows', () => {
    render(
      <AvailabilityGrid date="2026-07-23" playerAvailabilities={players} />
    );

    for (const hour of ['19:00', '20:00', '21:00', '22:00', '23:00']) {
      expect(screen.getByText(hour)).toBeInTheDocument();
    }
  });

  it('cycles a chip instantly on click and syncs to the server after the batch delay', async () => {
    render(
      <AvailabilityGrid date="2026-07-23" playerAvailabilities={players} />
    );

    // Josh @ 19:00 is "Ready" -> clicking cycles to "Maybe" without waiting
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    expect(screen.getByRole('button', { name: 'Maybe' })).toBeInTheDocument();
    expect(updateAvailabilityStatus).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(updateAvailabilityStatus).toHaveBeenCalledWith(
      1,
      '2026-07-23',
      '19',
      'uncertain'
    );
  });

  it('supports rapid-fire clicking: UI cycles each click, server gets only the final status', async () => {
    render(
      <AvailabilityGrid date="2026-07-23" playerAvailabilities={players} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    fireEvent.click(screen.getByRole('button', { name: 'Maybe' }));
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(300));

    expect(updateAvailabilityStatus).toHaveBeenCalledTimes(1);
    expect(updateAvailabilityStatus).toHaveBeenCalledWith(
      1,
      '2026-07-23',
      '19',
      'unready'
    );
  });

  it('reports user activity so polling can pause', () => {
    const onUserActivity = vi.fn();
    render(
      <AvailabilityGrid
        date="2026-07-23"
        playerAvailabilities={players}
        onUserActivity={onUserActivity}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    expect(onUserActivity).toHaveBeenCalledWith(true);

    act(() => vi.advanceTimersByTime(2000));
    expect(onUserActivity).toHaveBeenLastCalledWith(false);
  });

  it('sets a whole player column at once via the header button', async () => {
    render(
      <AvailabilityGrid date="2026-07-23" playerAvailabilities={players} />
    );

    // Toby has no data -> bulk status "unknown" -> next is "ready"
    fireEvent.click(screen.getByRole('button', { name: 'Toby' }));

    // All five default rows now show "Ready" for Toby
    expect(screen.getAllByRole('button', { name: 'Ready' })).toHaveLength(6); // 5 Toby + 1 Josh

    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(updateBulkAvailabilityStatus).toHaveBeenCalledWith(
      2,
      '2026-07-23',
      ['19', '20', '21', '22', '23'],
      'ready'
    );
  });

  it('adds an earlier time slot via the + button', () => {
    render(
      <AvailabilityGrid date="2026-07-23" playerAvailabilities={players} />
    );

    expect(screen.queryByText('18:00')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Add earlier time slot'));
    expect(screen.getByText('18:00')).toBeInTheDocument();
  });
});
