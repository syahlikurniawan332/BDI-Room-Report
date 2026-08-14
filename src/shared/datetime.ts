const WIB_TIMEZONE = 'Asia/Jakarta';

export function nowUtcIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

export function addHoursUtc(iso: string, hours: number): string {
  const date = new Date(iso);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

export function addDaysUtc(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().replace(/\.\d{3}Z$/, '.000Z');
}

export function formatWib(iso: string | null | undefined): string {
  if (!iso) return '-';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatWibDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB_TIMEZONE,
    dateStyle: 'medium',
  }).format(date);
}

export function toWibDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function isWeekendWib(dateStr: string): boolean {
  const date = new Date(`${dateStr}T12:00:00+07:00`);
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export { WIB_TIMEZONE };
