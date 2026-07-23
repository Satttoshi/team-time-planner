import { type Player, type AvailabilityStatus } from '@/lib/db/schema';
import { type PlayerAvailability } from '@/lib/actions';

let nextId = 1;

export function makePlayer(overrides: Partial<Player> = {}): Player {
  const id = overrides.id ?? nextId++;
  return {
    id,
    name: `Player ${id}`,
    role: 'player',
    sortOrder: id,
    isActive: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makePlayerAvailability(
  player: Partial<Player>,
  availability: Record<string, AvailabilityStatus> = {}
): PlayerAvailability {
  return { player: makePlayer(player), availability };
}
