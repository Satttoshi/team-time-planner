import { type AvailabilityStatus } from './db/schema';
import { type PlayerAvailability } from './actions';

const DEFAULT_HOURS = ['19', '20', '21', '22', '23'];

/**
 * Get all hours that have any data, ensuring we include default hours and additional hours
 */
export function getAllHours(
  additionalHours: string[],
  playerAvailabilities: PlayerAvailability[]
): string[] {
  return Array.from(
    new Set([
      ...additionalHours,
      ...DEFAULT_HOURS,
      ...playerAvailabilities.flatMap(pa => Object.keys(pa.availability)),
    ])
  ).sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Get the status for a specific player and hour, checking optimistic data first
 */
export function getStatus(
  playerId: number,
  hour: string,
  optimisticData: Record<string, AvailabilityStatus>,
  playerAvailabilities: PlayerAvailability[]
): AvailabilityStatus {
  const key = `${playerId}-${hour}`;

  // Check for optimistic update first
  const optimistic = optimisticData[key];
  if (optimistic) return optimistic;

  // Fallback to server data
  const playerData = playerAvailabilities.find(
    pa => pa.player.id === playerId
  );
  return playerData?.availability[hour] || 'unknown';
}

/**
 * Get current bulk status for a player (most common status across all hours)
 */
export function getBulkStatus(
  playerId: number,
  allHours: string[],
  optimisticData: Record<string, AvailabilityStatus>,
  playerAvailabilities: PlayerAvailability[]
): AvailabilityStatus {
  const statusCounts: Record<AvailabilityStatus, number> = {
    ready: 0,
    uncertain: 0,
    unready: 0,
    unknown: 0,
  };

  allHours.forEach(hour => {
    const status = getStatus(playerId, hour, optimisticData, playerAvailabilities);
    statusCounts[status]++;
  });

  // Return the most frequent status, with unknown as default
  let maxCount = 0;
  let mostFrequentStatus: AvailabilityStatus = 'unknown';

  (Object.entries(statusCounts) as [AvailabilityStatus, number][]).forEach(
    ([status, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentStatus = status;
      }
    }
  );

  return mostFrequentStatus;
}