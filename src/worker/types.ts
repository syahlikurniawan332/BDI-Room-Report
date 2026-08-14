export interface Env {
  DB: D1Database;
  PHOTO_BUCKET: R2Bucket;
  ASSETS: Fetcher;
  APP_ENV: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  SESSION_SECRET?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'ADMIN' | 'CS';
}

export type AppContext = {
  Bindings: Env;
  Variables: {
    user: SessionUser | null;
    sessionId: string | null;
  };
};
