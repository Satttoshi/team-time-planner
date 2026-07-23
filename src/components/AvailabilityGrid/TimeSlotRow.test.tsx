import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSlotRow } from './TimeSlotRow';
import { makePlayerAvailability } from '@/test-utils/factories';

const players = [
  makePlayerAvailability({ id: 1, name: 'Josh' }, { '19': 'ready' }),
  makePlayerAvailability({ id: 2, name: 'Toby' }, {}),
];

const baseProps = {
  hour: '19',
  playerAvailabilities: players,
  optimisticData: {},
  pendingUpdates: new Set<string>(),
  bulkPendingPlayers: new Set<number>(),
  onStatusChange: vi.fn(),
};

describe('TimeSlotRow', () => {
  it('renders the hour label and one chip per player', () => {
    render(<TimeSlotRow {...baseProps} />);

    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument(); // Josh
    expect(screen.getByRole('button', { name: '?' })).toBeInTheDocument(); // Toby
  });

  it('prefers optimistic data over server data for chip status', () => {
    render(
      <TimeSlotRow {...baseProps} optimisticData={{ '1-19': 'unready' }} />
    );
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('reports the player, hour and CURRENT status on click', () => {
    const onStatusChange = vi.fn();
    render(<TimeSlotRow {...baseProps} onStatusChange={onStatusChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    expect(onStatusChange).toHaveBeenCalledWith(1, '19', 'ready');
  });

  it('shows a sync ring on chips with pending updates', () => {
    render(
      <TimeSlotRow {...baseProps} pendingUpdates={new Set(['1-19'])} />
    );

    expect(screen.getByRole('button', { name: 'Ready' })).toHaveClass('ring-2');
    expect(screen.getByRole('button', { name: '?' })).not.toHaveClass('ring-2');
  });

  it('shows a sync ring on all chips of a bulk-pending player', () => {
    render(
      <TimeSlotRow {...baseProps} bulkPendingPlayers={new Set([2])} />
    );
    expect(screen.getByRole('button', { name: '?' })).toHaveClass('ring-2');
  });
});
