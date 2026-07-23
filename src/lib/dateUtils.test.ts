import { describe, it, expect } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import {
  getStartOfWeek,
  getNextFriday,
  getTwoWeekWindow,
  formatDateForDisplay,
  formatDateForStorage,
  isToday,
  getCurrentDayIndex,
  findPlayDayOpportunities,
  formatMatchDate,
  toMatchDateInputValue,
  matchDateInputToIso,
  defaultMatchDateInputValue,
  MATCH_TIME_ZONE,
} from './dateUtils';

const d = (iso: string) => Temporal.PlainDate.from(iso);

describe('getStartOfWeek', () => {
  it('returns Monday for a mid-week date', () => {
    // 2026-07-22 is a Wednesday
    expect(getStartOfWeek(d('2026-07-22')).toString()).toBe('2026-07-20');
  });

  it('returns the same day for a Monday', () => {
    expect(getStartOfWeek(d('2026-07-20')).toString()).toBe('2026-07-20');
  });

  it('returns the previous Monday for a Sunday', () => {
    // 2026-07-26 is a Sunday
    expect(getStartOfWeek(d('2026-07-26')).toString()).toBe('2026-07-20');
  });
});

describe('getNextFriday', () => {
  it('returns the Friday of the same week for a Monday', () => {
    expect(getNextFriday(d('2026-07-20')).toString()).toBe('2026-07-24');
  });

  it('returns the same day for a Friday', () => {
    expect(getNextFriday(d('2026-07-24')).toString()).toBe('2026-07-24');
  });

  it('returns the next Friday for a Saturday', () => {
    expect(getNextFriday(d('2026-07-25')).toString()).toBe('2026-07-31');
  });

  it('returns the next Friday for a Sunday', () => {
    expect(getNextFriday(d('2026-07-26')).toString()).toBe('2026-07-31');
  });

  it('defaults to a Friday relative to today when called without argument', () => {
    expect(getNextFriday().dayOfWeek).toBe(5);
  });
});

describe('getTwoWeekWindow', () => {
  it('shows 14 days starting from Monday of the current week on Monday-Thursday', () => {
    // Wednesday
    const window = getTwoWeekWindow(d('2026-07-22'));
    expect(window).toHaveLength(14);
    expect(window[0].toString()).toBe('2026-07-20');
    expect(window[13].toString()).toBe('2026-08-02');
  });

  it('always includes the given day (Thursday case)', () => {
    const window = getTwoWeekWindow(d('2026-07-23'));
    expect(window.map(String)).toContain('2026-07-23');
  });

  it('shows 17 days starting from Friday of the current week on Friday', () => {
    const window = getTwoWeekWindow(d('2026-07-24'));
    expect(window).toHaveLength(17);
    expect(window[0].toString()).toBe('2026-07-24');
    expect(window[16].toString()).toBe('2026-08-09');
  });

  it('starts from the Friday of the current week on Sunday, so today is included', () => {
    const window = getTwoWeekWindow(d('2026-07-26'));
    expect(window).toHaveLength(17);
    expect(window[0].toString()).toBe('2026-07-24');
    expect(window.map(String)).toContain('2026-07-26');
  });

  it('produces consecutive dates without gaps', () => {
    const window = getTwoWeekWindow(d('2026-07-22'));
    for (let i = 1; i < window.length; i++) {
      expect(window[i - 1].until(window[i]).days).toBe(1);
    }
  });
});

describe('formatDateForDisplay', () => {
  it('formats as "Weekday, Mon D"', () => {
    expect(formatDateForDisplay(d('2026-07-24'))).toBe('Friday, Jul 24');
  });
});

describe('formatDateForStorage', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(formatDateForStorage(d('2026-07-24'))).toBe('2026-07-24');
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    expect(isToday(Temporal.Now.plainDateISO())).toBe(true);
  });

  it('returns false for tomorrow', () => {
    expect(isToday(Temporal.Now.plainDateISO().add({ days: 1 }))).toBe(false);
  });
});

describe('getCurrentDayIndex', () => {
  it('finds the index of today within a date range', () => {
    const today = Temporal.Now.plainDateISO();
    const dates = [today.subtract({ days: 2 }), today.subtract({ days: 1 }), today];
    expect(getCurrentDayIndex(dates)).toBe(2);
  });

  it('falls back to 0 when today is not in the range', () => {
    const dates = [d('2020-01-01'), d('2020-01-02')];
    expect(getCurrentDayIndex(dates)).toBe(0);
  });
});

describe('findPlayDayOpportunities', () => {
  type Status = 'ready' | 'uncertain' | 'unready' | 'unknown';

  const pa = (
    id: number,
    name: string,
    availability: Record<string, Status>
  ) => ({ player: { id, name }, availability });

  const team = (hours: Record<string, Status>, count = 5) =>
    Array.from({ length: count }, (_, i) => pa(i + 1, `P${i + 1}`, hours));

  it('returns no opportunities when there is no availability data', () => {
    expect(findPlayDayOpportunities([])).toEqual([]);
    expect(findPlayDayOpportunities([pa(1, 'A', {})])).toEqual([]);
  });

  it('detects a block when 5 players are ready for 2 consecutive hours', () => {
    const result = findPlayDayOpportunities(
      team({ '19': 'ready', '20': 'ready' })
    );
    expect(result).toEqual([
      {
        startHour: 19,
        endHour: 20,
        playerCount: 5,
        players: ['P1', 'P2', 'P3', 'P4', 'P5'],
      },
    ]);
  });

  it('counts "uncertain" players as available', () => {
    const result = findPlayDayOpportunities(
      team({ '19': 'uncertain', '20': 'ready' })
    );
    expect(result).toHaveLength(1);
    expect(result[0].playerCount).toBe(5);
  });

  it('does not count "unready" or "unknown" players', () => {
    const players = [
      ...team({ '19': 'ready', '20': 'ready' }, 4),
      pa(5, 'P5', { '19': 'unready', '20': 'unknown' }),
    ];
    expect(findPlayDayOpportunities(players)).toEqual([]);
  });

  it('requires at least 5 available players', () => {
    expect(
      findPlayDayOpportunities(team({ '19': 'ready', '20': 'ready' }, 4))
    ).toEqual([]);
  });

  it('requires at least 2 consecutive hours', () => {
    expect(findPlayDayOpportunities(team({ '19': 'ready' }))).toEqual([]);
  });

  it('does not bridge a gap between non-consecutive hours', () => {
    // 19 and 21 are both fully available but 20 is missing
    expect(
      findPlayDayOpportunities(team({ '19': 'ready', '21': 'ready' }))
    ).toEqual([]);
  });

  it('detects a longer block spanning 3+ hours', () => {
    const result = findPlayDayOpportunities(
      team({ '19': 'ready', '20': 'ready', '21': 'ready' }, 6)
    );
    expect(result).toEqual([
      {
        startHour: 19,
        endHour: 21,
        playerCount: 6,
        players: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
      },
    ]);
  });

  it('ends the block when the player count drops below 5', () => {
    const players = [
      ...team({ '19': 'ready', '20': 'ready', '21': 'ready' }, 4),
      pa(5, 'P5', { '19': 'ready', '20': 'ready', '21': 'unready' }),
    ];
    const result = findPlayDayOpportunities(players);
    expect(result).toEqual([
      {
        startHour: 19,
        endHour: 20,
        playerCount: 5,
        players: ['P1', 'P2', 'P3', 'P4', 'P5'],
      },
    ]);
  });

  it('requires the SAME players for the whole block', () => {
    // Hours 19+20 have 5 available players each, but a different lineup
    const players = [
      ...team({ '19': 'ready', '20': 'ready' }, 4),
      pa(5, 'P5', { '19': 'ready', '20': 'unready' }),
      pa(6, 'P6', { '19': 'unready', '20': 'ready' }),
    ];
    expect(findPlayDayOpportunities(players)).toEqual([]);
  });

  it('finds two separate opportunities on the same day', () => {
    const result = findPlayDayOpportunities(
      team({
        '16': 'ready',
        '17': 'ready',
        '18': 'unready',
        '19': 'ready',
        '20': 'ready',
        '21': 'ready',
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ startHour: 16, endHour: 17 });
    expect(result[1]).toMatchObject({ startHour: 19, endHour: 21 });
  });
});

describe('match date helpers (CET wall-clock)', () => {
  it('formats a match date in Europe/Berlin regardless of local zone (summer, UTC+2)', () => {
    expect(formatMatchDate(new Date('2026-07-23T18:30:00Z'))).toBe(
      '23. July 2026 20:30 CET'
    );
  });

  it('formats a match date in winter (UTC+1)', () => {
    expect(formatMatchDate(new Date('2026-01-15T19:00:00Z'))).toBe(
      '15. January 2026 20:00 CET'
    );
  });

  it('rounds the datetime-local input value down to the nearest quarter hour', () => {
    // 18:07 UTC = 20:07 Berlin -> 20:00
    expect(toMatchDateInputValue(new Date('2026-07-23T18:07:00Z'))).toBe(
      '2026-07-23T20:00'
    );
  });

  it('rounds the datetime-local input value up to the nearest quarter hour', () => {
    // 18:08 UTC = 20:08 Berlin -> 20:15
    expect(toMatchDateInputValue(new Date('2026-07-23T18:08:00Z'))).toBe(
      '2026-07-23T20:15'
    );
  });

  it('rolls over to the next day when rounding up near midnight', () => {
    // 21:55 UTC = 23:55 Berlin -> 00:00 next day
    expect(toMatchDateInputValue(new Date('2026-07-23T21:55:00Z'))).toBe(
      '2026-07-24T00:00'
    );
  });

  it('interprets a datetime-local value as CET wall-clock time (summer)', () => {
    expect(matchDateInputToIso('2026-07-23T20:00')).toBe(
      '2026-07-23T18:00:00Z'
    );
  });

  it('interprets a datetime-local value as CET wall-clock time (winter)', () => {
    expect(matchDateInputToIso('2026-01-15T20:00')).toBe(
      '2026-01-15T19:00:00Z'
    );
  });

  it('round-trips between input value and ISO', () => {
    const iso = matchDateInputToIso('2026-07-23T20:15');
    expect(toMatchDateInputValue(new Date(iso))).toBe('2026-07-23T20:15');
  });

  it('defaults new match plans to today at 20:00 CET', () => {
    const value = defaultMatchDateInputValue();
    const todayInBerlin = Temporal.Now.plainDateISO(MATCH_TIME_ZONE).toString();
    expect(value).toBe(`${todayInBerlin}T20:00`);
  });
});
