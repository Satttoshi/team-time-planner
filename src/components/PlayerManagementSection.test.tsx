import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { makePlayer } from '@/test-utils/factories';

const actions = vi.hoisted(() => ({
  getPlayers: vi.fn(),
  addNewPlayer: vi.fn(),
  updatePlayerDetails: vi.fn(),
  togglePlayerActiveStatus: vi.fn(),
  deletePlayer: vi.fn(),
}));
vi.mock('@/lib/actions', () => actions);

import { PlayerManagementSection } from './PlayerManagementSection';

const roster = [
  makePlayer({ id: 1, name: 'Josh', isActive: 1 }),
  makePlayer({ id: 2, name: 'Jannis', role: 'coach', isActive: 1 }),
  makePlayer({ id: 3, name: 'Benchie', isActive: 0 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  actions.getPlayers.mockResolvedValue(roster);
  actions.addNewPlayer.mockResolvedValue(makePlayer({ name: 'New' }));
  actions.updatePlayerDetails.mockResolvedValue(undefined);
  actions.togglePlayerActiveStatus.mockResolvedValue(undefined);
  actions.deletePlayer.mockResolvedValue(undefined);
});

const renderAndWait = async (onPlayersChanged?: () => void) => {
  render(<PlayerManagementSection onPlayersChanged={onPlayersChanged} />);
  await screen.findByText('Josh');
};

describe('PlayerManagementSection', () => {
  it('groups players into active and inactive with an active count', async () => {
    await renderAndWait();

    expect(screen.getByText('2/6 active')).toBeInTheDocument();
    expect(screen.getByText('Active Players')).toBeInTheDocument();
    expect(screen.getByText('Inactive Players')).toBeInTheDocument();
    expect(screen.getByText('Benchie')).toBeInTheDocument();
    expect(screen.getByText('Coach')).toBeInTheDocument(); // Jannis' role badge
  });

  describe('adding a player', () => {
    it('submits the new player with name and role', async () => {
      const onPlayersChanged = vi.fn();
      await renderAndWait(onPlayersChanged);

      fireEvent.click(screen.getByText('Add New Player'));
      fireEvent.change(screen.getByPlaceholderText('Player name'), {
        target: { value: '  Ana  ' },
      });
      fireEvent.change(screen.getByDisplayValue('Player'), {
        target: { value: 'coach' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Add Player' }));

      await waitFor(() => {
        expect(actions.addNewPlayer).toHaveBeenCalledWith('Ana', 'coach');
      });
      expect(onPlayersChanged).toHaveBeenCalled();
    });

    it('disables submission while the name is empty', async () => {
      await renderAndWait();

      fireEvent.click(screen.getByText('Add New Player'));
      expect(screen.getByRole('button', { name: 'Add Player' })).toBeDisabled();
    });

    it('cancelling hides and resets the form', async () => {
      await renderAndWait();

      fireEvent.click(screen.getByText('Add New Player'));
      fireEvent.change(screen.getByPlaceholderText('Player name'), {
        target: { value: 'Ana' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(
        screen.queryByPlaceholderText('Player name')
      ).not.toBeInTheDocument();
      expect(actions.addNewPlayer).not.toHaveBeenCalled();
    });
  });

  describe('editing a player', () => {
    it('saves the changed name and role', async () => {
      await renderAndWait();

      // Edit Josh (first edit button belongs to the first active player)
      fireEvent.click(screen.getAllByTitle('Edit player')[0]);
      fireEvent.change(screen.getByDisplayValue('Josh'), {
        target: { value: 'Joshua' },
      });
      fireEvent.click(screen.getByTitle('Save changes'));

      await waitFor(() => {
        expect(actions.updatePlayerDetails).toHaveBeenCalledWith(
          1,
          'Joshua',
          'player'
        );
      });
    });

    it('cancelling the edit keeps the original data', async () => {
      await renderAndWait();

      fireEvent.click(screen.getAllByTitle('Edit player')[0]);
      fireEvent.click(screen.getByTitle('Cancel edit'));

      expect(screen.getByText('Josh')).toBeInTheDocument();
      expect(actions.updatePlayerDetails).not.toHaveBeenCalled();
    });

    it('cannot save an empty name', async () => {
      await renderAndWait();

      fireEvent.click(screen.getAllByTitle('Edit player')[0]);
      fireEvent.change(screen.getByDisplayValue('Josh'), {
        target: { value: '   ' },
      });

      expect(screen.getByTitle('Save changes')).toBeDisabled();
    });
  });

  describe('activating / deactivating', () => {
    it('deactivates an active player', async () => {
      await renderAndWait();

      fireEvent.click(screen.getAllByTitle('Set as inactive')[0]);

      await waitFor(() => {
        expect(actions.togglePlayerActiveStatus).toHaveBeenCalledWith(
          1,
          false
        );
      });
    });

    it('activates an inactive player', async () => {
      await renderAndWait();

      fireEvent.click(screen.getByTitle('Set as active'));

      await waitFor(() => {
        expect(actions.togglePlayerActiveStatus).toHaveBeenCalledWith(3, true);
      });
    });

    it('surfaces the 6-player limit as an inline error banner', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      actions.togglePlayerActiveStatus.mockRejectedValueOnce(
        new Error('Cannot activate player: Maximum of 6 active players allowed')
      );
      await renderAndWait();

      fireEvent.click(screen.getByTitle('Set as active'));

      expect(
        await screen.findByText(
          'Cannot activate player: Maximum of 6 active players allowed'
        )
      ).toBeInTheDocument();
    });
  });

  describe('deleting a player', () => {
    it('asks for confirmation naming the player', async () => {
      await renderAndWait();

      fireEvent.click(screen.getAllByTitle('Delete player')[0]);

      expect(
        await screen.findByRole('heading', { name: 'Delete Player' })
      ).toBeInTheDocument();
      expect(screen.getByText('Josh', { selector: 'strong' })).toBeInTheDocument();
      expect(actions.deletePlayer).not.toHaveBeenCalled();
    });

    it('deletes after confirmation and notifies the parent', async () => {
      const onPlayersChanged = vi.fn();
      await renderAndWait(onPlayersChanged);

      fireEvent.click(screen.getAllByTitle('Delete player')[0]);
      fireEvent.click(
        await screen.findByRole('button', { name: /Yes, Delete/ })
      );

      await waitFor(() => {
        expect(actions.deletePlayer).toHaveBeenCalledWith(1);
      });
      expect(onPlayersChanged).toHaveBeenCalled();
    });

    it('does not delete when the confirmation is cancelled', async () => {
      await renderAndWait();

      fireEvent.click(screen.getAllByTitle('Delete player')[0]);
      fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: 'Delete Player' })
        ).not.toBeInTheDocument();
      });
      expect(actions.deletePlayer).not.toHaveBeenCalled();
    });
  });
});
