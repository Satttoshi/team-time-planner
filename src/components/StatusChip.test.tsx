import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusChip, getNextStatus } from './StatusChip';

describe('StatusChip', () => {
  it.each([
    ['ready', 'Ready'],
    ['uncertain', 'Maybe'],
    ['unready', 'No'],
    ['unknown', '?'],
  ] as const)('renders the "%s" status as "%s"', (status, label) => {
    render(<StatusChip status={status} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('applies the matching status design token', () => {
    render(<StatusChip status="ready" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveClass('text-status-ready');
  });

  it('invokes onClick when pressed', () => {
    const onClick = vi.fn();
    render(<StatusChip status="unknown" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a custom className', () => {
    render(<StatusChip status="ready" onClick={() => {}} className="w-full" />);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });
});

describe('getNextStatus', () => {
  it('cycles unknown -> ready -> uncertain -> unready -> unknown', () => {
    expect(getNextStatus('unknown')).toBe('ready');
    expect(getNextStatus('ready')).toBe('uncertain');
    expect(getNextStatus('uncertain')).toBe('unready');
    expect(getNextStatus('unready')).toBe('unknown');
  });
});
