import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GridHeader } from './GridHeader';
import { makePlayerAvailability } from '@/test-utils/factories';

const players = [
  makePlayerAvailability(
    { id: 1, name: 'Josh' },
    { '19': 'ready', '20': 'ready' }
  ),
  makePlayerAvailability({ id: 2, name: 'Toby' }, {}),
];

const baseProps = {
  playerAvailabilities: players,
  allHours: ['19', '20'],
  optimisticData: {},
  bulkPendingPlayers: new Set<number>(),
  canAddEarlyHour: true,
  onAddEarlyHour: vi.fn(),
  onBulkStatusChange: vi.fn(),
};

describe('GridHeader', () => {
  it('renders a header button per player', () => {
    render(<GridHeader {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Josh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toby' })).toBeInTheDocument();
  });

  it('triggers the add-early-hour callback', () => {
    const onAddEarlyHour = vi.fn();
    render(<GridHeader {...baseProps} onAddEarlyHour={onAddEarlyHour} />);

    fireEvent.click(screen.getByTitle('Add earlier time slot'));
    expect(onAddEarlyHour).toHaveBeenCalledTimes(1);
  });

  it('disables the add button when no earlier slot is available', () => {
    render(<GridHeader {...baseProps} canAddEarlyHour={false} />);
    expect(screen.getByTitle('Add earlier time slot')).toBeDisabled();
  });

  it('requests a bulk status change for the clicked player', () => {
    const onBulkStatusChange = vi.fn();
    render(
      <GridHeader {...baseProps} onBulkStatusChange={onBulkStatusChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Josh' }));
    expect(onBulkStatusChange).toHaveBeenCalledWith(1);
  });

  it('announces the NEXT bulk status in the tooltip', () => {
    render(<GridHeader {...baseProps} />);

    // Josh is fully "ready" -> next status in the cycle is "uncertain"
    expect(screen.getByRole('button', { name: 'Josh' })).toHaveAttribute(
      'title',
      'Josh - Click to set all times to uncertain'
    );
  });

  it('tints the player name by their dominant status', () => {
    render(<GridHeader {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Josh' })).toHaveClass(
      'text-status-ready'
    );
  });

  it('marks bulk-pending players with a sync ring', () => {
    render(<GridHeader {...baseProps} bulkPendingPlayers={new Set([1])} />);
    expect(screen.getByRole('button', { name: 'Josh' })).toHaveClass('ring-2');
  });
});
