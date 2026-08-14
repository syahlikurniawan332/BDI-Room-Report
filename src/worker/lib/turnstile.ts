import type { Env } from '../types';

interface TurnstileResponse {
  success: boolean;
}

export async function verifyTurnstile(
  env: Env,
  token: string,
  remoteIp: string,
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    return env.APP_ENV === 'development';
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: remoteIp,
  });

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = (await response.json()) as TurnstileResponse;
  return data.success === true;
}
