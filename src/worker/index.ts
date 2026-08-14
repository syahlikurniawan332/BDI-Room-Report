import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppContext } from './types';
import { api } from './routes';
import { handleScheduled } from './cron';

const app = new Hono<AppContext>();

app.use(
  '/api/*',
  cors({
    origin: (origin) => origin ?? '*',
    credentials: true,
  }),
);

app.route('/api', api);

app.get('/api/*', (c) => c.json({ error: 'Not found' }, 404));

app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
