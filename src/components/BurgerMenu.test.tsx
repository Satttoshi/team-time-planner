import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { makePlayer } from '@/test-utils/factories';

const actions = vi.hoisted(() => ({
  deleteDayData: vi.fn(),
  getPlayers: vi.fn(),
  updatePlayerSortOrder: vi.fn(),
  addNewPlayer: vi.fn(),
  updatePlayerDetails: vi.fn(),
  togglePlayerActiveStatus: vi.fn(),
  deletePlayer: vi.fn(),
}));
vi.mock('@/lib/actions', () => actions);

const setTheme = vi.hoisted(() => vi.fn());
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme, resolvedTheme: 'dark' }),
}));

import { BurgerMenu } from './BurgerMenu';

beforeEach(() => {
  vi.clearAllMocks();
  actions.getPlayers.mockResolvedValue([makePlayer({ id: 1, name: 'Josh' })]);
  actions.deleteDayData.mockResolvedValue(undefined);
});

const openMenu = () => fireEvent.click(screen.getByTitle('Options'));

describe('BurgerMenu', () => {
  it('opens the options dialog with theme, player and day sections', async () => {
    render(<BurgerMenu date="2026-07-23" />);
    openMenu();

    expect(
      await screen.findByRole('heading', { name: 'Options' })
    ).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Player Order')).toBeInTheDocument();
    expect(screen.getByText('Player Management')).toBeInTheDocument();
    expect(screen.getByText('Day Options')).toBeInTheDocument();
  });

  it('switches the theme', async () => {
    render(<BurgerMenu date="2026-07-23" />);
    openMenu();

    fireEvent.click(await screen.findByRole('button', { name: /Dark Theme/ }));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('shows the resolved theme next to the selected system option', async () => {
    render(<BurgerMenu date="2026-07-23" />);
    openMenu();

    expect(await screen.findByText('(dark)')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting day data', async () => {
    render(<BurgerMenu date="2026-07-23" />);
    openMenu();

    fireEvent.click(await screen.findByText('Delete Day Data'));

    expect(
      screen.getByText(/Are you sure you want to delete all availability data/)
    ).toBeInTheDocument();
    expect(actions.deleteDayData).not.toHaveBeenCalled();
  });

  it('returns to the options view when the confirmation is cancelled', async () => {
    render(<BurgerMenu date="2026-07-23" />);
    openMenu();

    fireEvent.click(await screen.findByText('Delete Day Data'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Day Options')).toBeInTheDocument();
    expect(actions.deleteDayData).not.toHaveBeenCalled();
  });

  it('deletes the day data after confirmation and closes the dialog', async () => {
    const onDelete = vi.fn();
    render(<BurgerMenu date="2026-07-23" onDelete={onDelete} />);
    openMenu();

    fireEvent.click(await screen.findByText('Delete Day Data'));
    fireEvent.click(screen.getByRole('button', { name: /Yes, Delete/ }));

    await waitFor(() => {
      expect(actions.deleteDayData).toHaveBeenCalledWith('2026-07-23');
    });
    expect(onDelete).toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Options' })
      ).not.toBeInTheDocument();
    });
  });

  it('keeps the dialog open when deletion fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    actions.deleteDayData.mockRejectedValueOnce(new Error('db down'));
    render(<BurgerMenu date="2026-07-23" />);
    openMenu();

    fireEvent.click(await screen.findByText('Delete Day Data'));
    fireEvent.click(screen.getByRole('button', { name: /Yes, Delete/ }));

    await waitFor(() => {
      expect(actions.deleteDayData).toHaveBeenCalled();
    });
    expect(
      screen.getByRole('heading', { name: 'Options' })
    ).toBeInTheDocument();
  });
});
