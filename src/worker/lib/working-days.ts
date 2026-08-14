import { isWeekendWib, toWibDateString } from '@shared/datetime';

export function countWorkingDaysBetween(
  startDateExclusive: string,
  endDateInclusive: string,
  holidays: Set<string>,
): number {
  const start = new Date(`${startDateExclusive}T12:00:00+07:00`);
  const end = new Date(`${endDateInclusive}T12:00:00+07:00`);
  let count = 0;
  const cursor = new Date(start);
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  while (cursor <= end) {
    const dateStr = toWibDateString(cursor);
    if (!isWeekendWib(dateStr) && !holidays.has(dateStr)) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export async function loadActiveHolidayDates(db: D1Database): Promise<Set<string>> {
  const rows = await db
    .prepare('SELECT holiday_date FROM holidays WHERE is_active = 1')
    .all<{ holiday_date: string }>();
  return new Set((rows.results ?? []).map((r) => r.holiday_date));
}
