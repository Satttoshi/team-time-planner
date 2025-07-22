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

export function getTwoWeekWindow(startDate?: Temporal.PlainDate): Temporal.PlainDate[] {
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
    // Friday-Sunday: Show last 3 days of current week and next 2 weeks (14 days)
    const startOfCurrentWeek = getStartOfWeek(today);
    const fridayOfCurrentWeek = startOfCurrentWeek.add({ days: 4 }); // Friday is the 5th day, index 4
    for (let i = 0; i < 14; i++) {
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
    day: 'numeric'
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

  const index = dates.findIndex(date =>
    formatDateForStorage(date) === todayString
  );

  return index >= 0 ? index : 0;
}
