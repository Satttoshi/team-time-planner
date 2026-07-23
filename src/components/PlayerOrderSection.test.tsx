import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { makePlayer } from '@/test-utils/factories';

const actions = vi.hoisted(() => ({
  getPlayers: vi.fn(),
  updatePlayerSortOrder: vi.fn(),
}));
vi.mock('@/lib/actions', () => actions);

import { PlayerOrderSection } from './PlayerOrderSection';

beforeEach(() => {
  vi.clearAllMocks();
  actions.getPlayers.mockResolvedValue([
    makePlayer({ id: 1, name: 'Josh' }),
    makePlayer({ id: 2, name: 'Jannis', role: 'coach' }),
  ]);
});

describe('PlayerOrderSection', () => {
  it('shows a loading skeleton while players load', () => {
    actions.getPlayers.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<PlayerOrderSection />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders a draggable chip per active player, coaches labelled', async () => {
    render(<PlayerOrderSection />);

    expect(await screen.findByText('Josh')).toBeInTheDocument();
    expect(screen.getByText('Jannis')).toBeInTheDocument();
    expect(screen.getByText('Coach')).toBeInTheDocument();
    expect(actions.getPlayers).toHaveBeenCalledWith(true); // active players only
  });

  it('reloads the list when refreshTrigger changes (players added/removed)', async () => {
    const { rerender } = render(<PlayerOrderSection refreshTrigger={0} />);
    await screen.findByText('Josh');

    rerender(<PlayerOrderSection refreshTrigger={1} />);

    await waitFor(() => {
      expect(actions.getPlayers).toHaveBeenCalledTimes(2);
    });
  });
});
