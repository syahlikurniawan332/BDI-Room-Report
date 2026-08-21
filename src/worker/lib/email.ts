import type { Env } from '../types';
import { formatWib } from '@shared/datetime';

const DEFAULT_RESEND_FROM = 'BDI Medan Cleaning Control <onboarding@resend.dev>';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildInactiveReminderEmail(data: {
  displayName: string;
  username: string;
  email: string;
  lastSubmittedAt: string | null;
  workingDaysInactive: number;
  draftCount: number;
}) {
  const displayName = escapeHtml(data.displayName);
  const username = escapeHtml(data.username);
  const email = escapeHtml(data.email);
  const lastReport = data.lastSubmittedAt
    ? `${formatWib(data.lastSubmittedAt)} WIB`
    : 'Belum pernah mengirim laporan';

  return {
    subject: `[BDI Cleaning Control] CS tidak aktif ${data.workingDaysInactive} hari kerja — ${data.displayName}`,
    html: `<!doctype html>
<html lang="id">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#17233d">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f1f5f9">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff">
          <tr><td style="padding:24px;background:#17233d;color:#ffffff">
            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d8c9a7">BDI Medan Cleaning Control</div>
            <h1 style="margin:10px 0 0;font-size:22px">Peringatan Ketidakaktifan CS</h1>
          </td></tr>
          <tr><td style="padding:24px">
            <p style="margin:0 0 16px;line-height:1.6">Cleaning Service <strong>${displayName}</strong> belum mengirim laporan selama <strong>${data.workingDaysInactive} hari kerja</strong>.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f8fafc;border-radius:12px">
              <tr><td style="padding:10px 14px;color:#64748b">Nama</td><td style="padding:10px 14px;font-weight:600">${displayName}</td></tr>
              <tr><td style="padding:10px 14px;color:#64748b">Username</td><td style="padding:10px 14px">${username}</td></tr>
              <tr><td style="padding:10px 14px;color:#64748b">Email CS</td><td style="padding:10px 14px">${email}</td></tr>
              <tr><td style="padding:10px 14px;color:#64748b">Laporan terakhir</td><td style="padding:10px 14px">${escapeHtml(lastReport)}</td></tr>
              <tr><td style="padding:10px 14px;color:#64748b">Draft aktif</td><td style="padding:10px 14px">${data.draftCount}</td></tr>
            </table>
            <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#64748b">Hari kerja dihitung Senin–Sabtu dan tidak memasukkan tanggal libur aktif pada sistem.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured; skipping email');
    return false;
  }

  const from = env.RESEND_FROM_EMAIL ?? DEFAULT_RESEND_FROM;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    console.error('Failed to send email', await response.text());
    return false;
  }
  return true;
}
