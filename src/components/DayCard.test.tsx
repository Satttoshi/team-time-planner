import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Temporal } from 'temporal-polyfill';
import { makePlayerAvailability } from '@/test-utils/factories';
import { type PlayerAvailability } from '@/lib/actions';

vi.mock('@/lib/actions', () => ({
  updateAvailabilityStatus: vi.fn().mockResolvedValue(undefined),
  updateBulkAvailabilityStatus: vi.fn().mockResolvedValue(undefined),
  deleteDayData: vi.fn().mockResolvedValue(undefined),
  getPlayers: vi.fn().mockResolvedValue([]),
  updatePlayerSortOrder: vi.fn().mockResolvedValue(undefined),
  addNewPlayer: vi.fn(),
  updatePlayerDetails: vi.fn(),
  togglePlayerActiveStatus: vi.fn(),
  deletePlayer: vi.fn(),
}));

import { DayCard } from './DayCard';

const renderDayCard = (playerAvailabilities: PlayerAvailability[]) =>
  render(
    <DayCard
      date={Temporal.PlainDate.from('2026-07-24')}
      dateString="2026-07-24"
      playerAvailabilities={playerAvailabilities}
      swiper={null}
      canGoPrev={false}
      canGoNext={false}
    />
  );

const fullTeam = (hours: Record<string, 'ready'>) =>
  Array.from({ length: 5 }, (_, i) =>
    makePlayerAvailability({ id: i + 1, name: `P${i + 1}` }, hours)
  );

describe('DayCard', () => {
  it('shows the formatted date in the header', () => {
    renderDayCard([]);
    expect(
      screen.getByRole('heading', { name: 'Friday, Jul 24' })
    ).toBeInTheDocument();
  });

  it('announces a play day when 5 players share 2+ consecutive hours', () => {
    renderDayCard(fullTeam({ '19': 'ready', '20': 'ready' }));

    // endHour is inclusive, so a 19-20 block is displayed as 19:00-21:00
    expect(
      screen.getByRole('heading', { name: 'Possible Playday 19:00-21:00' })
    ).toBeInTheDocument();
    expect(screen.getByText('5 players available')).toBeInTheDocument();
  });

  it('shows "No Practice Opportunity" when no block qualifies', () => {
    renderDayCard(fullTeam({ '19': 'ready' })); // only one hour

    expect(
      screen.getByRole('heading', { name: 'No Practice Opportunity' })
    ).toBeInTheDocument();
  });

  it('lists every qualifying window of the day', () => {
    renderDayCard(
      fullTeam({
        '16': 'ready',
        '17': 'ready',
        '19': 'ready',
        '20': 'ready',
        '21': 'ready',
      })
    );

    expect(
      screen.getByRole('heading', { name: 'Possible Playday 16:00-18:00' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Possible Playday 19:00-22:00' })
    ).toBeInTheDocument();
  });
});
