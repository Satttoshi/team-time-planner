export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

export function getNextFriday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const daysUntilFriday = day <= 5 ? 5 - day : 7 - day + 5;
  return new Date(d.setDate(d.getDate() + daysUntilFriday));
}

export function getTwoWeekWindow(startDate?: Date): Date[] {
  const friday = startDate || getNextFriday();
  const dates: Date[] = [];
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(friday);
    date.setDate(friday.getDate() + i);
    dates.push(date);
  }
  
  return dates;
}

export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateForStorage(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return formatDateForStorage(date) === formatDateForStorage(today);
}

export function getCurrentDayIndex(dates: Date[]): number {
  const today = new Date();
  const todayString = formatDateForStorage(today);
  
  const index = dates.findIndex(date => 
    formatDateForStorage(date) === todayString
  );
  
  return index >= 0 ? index : 0;
}