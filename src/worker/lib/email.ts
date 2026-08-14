import type { Env } from '../types';

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

  const from = env.ADMIN_NOTIFICATION_EMAIL ?? 'noreply@bdi-medan.invalid';
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
