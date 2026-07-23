import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { makePlayer } from '@/test-utils/factories';
import { getTwoWeekWindow, formatDateForStorage } from '@/lib/dateUtils';

const actions = vi.hoisted(() => ({
  getAllPlayerAvailabilityForDates: vi.fn(),
  getPlayers: vi.fn(),
}));
vi.mock('@/lib/actions', () => actions);

// The Swiper wrapper drives real touch/DOM behavior that jsdom can't emulate;
// replace it with a probe that exposes the data it receives.
vi.mock('./SwiperContainer', () => ({
  SwiperContainer: ({
    playerAvailabilityMap,
  }: {
    playerAvailabilityMap: Record<string, unknown>;
  }) => (
    <div data-testid="swiper">
      {Object.keys(playerAvailabilityMap).join(',')}
    </div>
  ),
}));

import { PlannerClient } from './PlannerClient';

beforeEach(() => {
  vi.clearAllMocks();
  actions.getAllPlayerAvailabilityForDates.mockResolvedValue({});
  actions.getPlayers.mockResolvedValue([makePlayer({ id: 1, name: 'Josh' })]);
});

describe('PlannerClient', () => {
  it('renders the initial server data and a link to the match planner', () => {
    render(<PlannerClient initialData={{ '2026-07-23': [] }} />);

    expect(screen.getByTestId('swiper')).toHaveTextContent('2026-07-23');
    expect(
      screen.getByRole('link', { name: /Match Plans/ })
    ).toHaveAttribute('href', '/match-planner');
  });

  it('polls availability for the full visible date window', async () => {
    render(<PlannerClient initialData={{}} />);

    await waitFor(() => {
      expect(actions.getAllPlayerAvailabilityForDates).toHaveBeenCalled();
    });

    const expectedDates = getTwoWeekWindow().map(formatDateForStorage);
    expect(actions.getAllPlayerAvailabilityForDates).toHaveBeenCalledWith(
      expectedDates
    );
  });

  it('updates the UI with freshly polled data', async () => {
    actions.getAllPlayerAvailabilityForDates.mockResolvedValue({
      '2026-09-01': [],
    });
    render(<PlannerClient initialData={{}} />);

    await waitFor(() => {
      expect(screen.getByTestId('swiper')).toHaveTextContent('2026-09-01');
    });
  });

  it('falls back to an empty grid for all players when polling fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    actions.getAllPlayerAvailabilityForDates.mockRejectedValue(
      new Error('network down')
    );
    render(<PlannerClient initialData={{}} />);

    await waitFor(() => {
      expect(actions.getPlayers).toHaveBeenCalledWith(true);
    });

    // Every date of the window is present in the fallback map
    const expectedDates = getTwoWeekWindow().map(formatDateForStorage);
    await waitFor(() => {
      expect(screen.getByTestId('swiper')).toHaveTextContent(
        expectedDates.join(',')
      );
    });
  });
});
