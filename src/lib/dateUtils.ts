import { Temporal } from 'temporal-polyfill';

export function getStartOfWeek(date: Temporal.PlainDate): Temporal.PlainDate {
  const dayOfWeek = date.dayOfWeek; // 1 = Monday, 7 = Sunday
  const diff = dayOfWeek === 7 ? -6 : 1 - dayOfWeek; // adjust when day is Sunday
  return date.add({ days: diff });
}

export function getNextFriday(date?: Temporal.PlainDate): Temporal.PlainDate {
  const d = date || Temporal.Now.plainDateISO();
  const dayOfWeek = d.dayOfWeek; // 1 = Monday, 5 = Friday, 7 = Sunday
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
  return d.add({ days: daysUntilFriday });
}

export function getTwoWeekWindow(
  startDate?: Temporal.PlainDate
): Temporal.PlainDate[] {
  const today = startDate || Temporal.Now.plainDateISO();
  const dayOfWeek = today.dayOfWeek; // 1 = Monday, 7 = Sunday
  const dates: Temporal.PlainDate[] = [];

  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Monday-Thursday: Show current week + next week (14 days)
    const startOfCurrentWeek = getStartOfWeek(today);
    for (let i = 0; i < 14; i++) {
      const date = startOfCurrentWeek.add({ days: i });
      dates.push(date);
    }
  } else {
    // Friday-Sunday: Show 2 weeks ahead + following weekend (17 days)
    // This unlocks the next weekend for planning when current weekend starts
    const startOfCurrentWeek = getStartOfWeek(today);
    const fridayOfCurrentWeek = startOfCurrentWeek.add({ days: 4 }); // Friday is the 5th day, index 4
    for (let i = 0; i < 17; i++) {
      const date = fridayOfCurrentWeek.add({ days: i });
      dates.push(date);
    }
  }

  return dates;
}

export function formatDateForDisplay(date: Temporal.PlainDate): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateForStorage(date: Temporal.PlainDate): string {
  return date.toString(); // YYYY-MM-DD format
}

export function isToday(date: Temporal.PlainDate): boolean {
  const today = Temporal.Now.plainDateISO();
  return formatDateForStorage(date) === formatDateForStorage(today);
}

export function getCurrentDayIndex(dates: Temporal.PlainDate[]): number {
  const today = Temporal.Now.plainDateISO();
  const todayString = formatDateForStorage(today);

  const index = dates.findIndex(
    date => formatDateForStorage(date) === todayString
  );

  return index >= 0 ? index : 0;
}

export interface PlayDayOpportunity {
  startHour: number;
  endHour: number;
  playerCount: number;
  players: string[];
}

export function findPlayDayOpportunities(
  playerAvailabilities: Array<{
    player: { id: number; name: string };
    availability: Record<string, 'ready' | 'uncertain' | 'unready' | 'unknown'>;
  }>
): PlayDayOpportunity[] {
  const opportunities: PlayDayOpportunity[] = [];
  const allHours = Array.from(
    new Set(
      playerAvailabilities.flatMap(pa => Object.keys(pa.availability))
    )
  ).map(h => parseInt(h)).sort((a, b) => a - b);

  if (allHours.length === 0) return opportunities;

  // Find consecutive blocks where 5+ players are available
  let currentBlockStart = -1;
  let currentBlockPlayers: string[] = [];
  
  for (let i = 0; i < allHours.length; i++) {
    const hour = allHours[i];
    
    // Find players available for this hour
    const availablePlayersThisHour = playerAvailabilities.filter(pa => {
      const status = pa.availability[hour.toString()];
      return status === 'ready' || status === 'uncertain';
    });
    
    // Check if we have 5+ players AND if it's consecutive to previous hour
    const hasEnoughPlayers = availablePlayersThisHour.length >= 5;
    const isConsecutive = i === 0 || allHours[i] === allHours[i - 1] + 1;
    
    if (hasEnoughPlayers) {
      // Check if same players as current block (for consecutive blocks)
      const currentPlayerNames = availablePlayersThisHour.map(pa => pa.player.name).sort();
      const samePlayersAsPrevious = currentBlockPlayers.length === 0 || 
        JSON.stringify(currentPlayerNames) === JSON.stringify(currentBlockPlayers.sort());
      
      if (currentBlockStart === -1) {
        // Start new block
        currentBlockStart = hour;
        currentBlockPlayers = currentPlayerNames;
      } else if (isConsecutive && samePlayersAsPrevious) {
        // Continue current block (same players, consecutive hour)
        // currentBlockPlayers stays the same
      } else {
        // End current block and start new one
        if (currentBlockStart !== -1 && allHours[i - 1] - currentBlockStart >= 1) {
          // Save previous block (2+ hours minimum)
          opportunities.push({
            startHour: currentBlockStart,
            endHour: allHours[i - 1],
            playerCount: currentBlockPlayers.length,
            players: currentBlockPlayers
          });
        }
        // Start new block
        currentBlockStart = hour;
        currentBlockPlayers = currentPlayerNames;
      }
    } else {
      // Not enough players, end current block if exists
      if (currentBlockStart !== -1 && allHours[i - 1] - currentBlockStart >= 1) {
        opportunities.push({
          startHour: currentBlockStart,
          endHour: allHours[i - 1],
          playerCount: currentBlockPlayers.length,
          players: currentBlockPlayers
        });
      }
      currentBlockStart = -1;
      currentBlockPlayers = [];
    }
  }
  
  // Handle final block
  if (currentBlockStart !== -1 && allHours[allHours.length - 1] - currentBlockStart >= 1) {
    opportunities.push({
      startHour: currentBlockStart,
      endHour: allHours[allHours.length - 1],
      playerCount: currentBlockPlayers.length,
      players: currentBlockPlayers
    });
  }

  return opportunities;
}
