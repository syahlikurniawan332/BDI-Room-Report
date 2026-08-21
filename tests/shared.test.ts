import { describe, it, expect } from 'vitest';
import { verifyPassword, hashPassword } from '../src/shared/password';
import { countWorkingDaysBetween } from '../src/worker/lib/working-days';
import { isWorkingDayWib } from '../src/worker/lib/working-days';
import { buildInactiveReminderEmail } from '../src/worker/lib/email';
import { formatWib, toWibDateString } from '../src/shared/datetime';

describe('password', () => {
  it('hashes and verifies password', async () => {
    const record = await hashPassword('TestPassword!9aA');
    const ok = await verifyPassword(
      'TestPassword!9aA',
      record.passwordHash,
      record.passwordSalt,
      record.passwordIterations,
    );
    expect(ok).toBe(true);
  });

  it('rejects wrong password', async () => {
    const record = await hashPassword('CorrectPassword!9aA');
    const ok = await verifyPassword(
      'WrongPassword!9aA',
      record.passwordHash,
      record.passwordSalt,
      record.passwordIterations,
    );
    expect(ok).toBe(false);
  });
});

describe('working days', () => {
  it('counts Monday through Saturday and skips Sunday and holidays', () => {
    const holidays = new Set(['2026-08-17']);
    const days = countWorkingDaysBetween('2026-08-13', '2026-08-18', holidays);
    expect(days).toBe(3);
    expect(isWorkingDayWib('2026-08-15', holidays)).toBe(true);
    expect(isWorkingDayWib('2026-08-16', holidays)).toBe(false);
    expect(isWorkingDayWib('2026-08-17', holidays)).toBe(false);
  });
});

describe('inactive reminder email', () => {
  it('builds the admin notification template safely', () => {
    const email = buildInactiveReminderEmail({
      displayName: 'CS <Contoh>',
      username: 'cs.contoh',
      email: 'cs@example.com',
      lastSubmittedAt: null,
      workingDaysInactive: 3,
      draftCount: 1,
    });

    expect(email.subject).toContain('3 hari kerja');
    expect(email.html).toContain('Peringatan Ketidakaktifan CS');
    expect(email.html).toContain('Senin–Sabtu');
    expect(email.html).toContain('CS &lt;Contoh&gt;');
    expect(email.html).not.toContain('CS <Contoh>');
  });
});

describe('datetime', () => {
  it('formats WIB label', () => {
    const formatted = formatWib('2026-08-14T04:30:00.000Z');
    expect(formatted).toContain('2026');
  });

  it('produces WIB date string', () => {
    const date = new Date('2026-08-14T04:30:00.000Z');
    expect(toWibDateString(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
