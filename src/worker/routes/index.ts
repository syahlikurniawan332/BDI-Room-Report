import { Hono } from 'hono';
import type { AppContext } from '../types';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { areaRoutes } from './areas';
import { reportRoutes } from './reports';
import { complaintRoutes } from './complaints';
import { holidayRoutes } from './holidays';
import { settingsRoutes } from './settings';
import { photoRoutes } from './photos';
import { publicRoutes } from './public';
import { notificationRoutes } from './notifications';
import { dashboardRoutes } from './dashboard';
import { authMiddleware } from '../middleware/auth';

export const api = new Hono<AppContext>();

api.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

api.route('/auth', authRoutes);
api.route('/public', publicRoutes);
api.route('/photos', photoRoutes);

api.use('/*', authMiddleware);

api.route('/users', userRoutes);
api.route('/areas', areaRoutes);
api.route('/reports', reportRoutes);
api.route('/complaints', complaintRoutes);
api.route('/holidays', holidayRoutes);
api.route('/settings', settingsRoutes);
api.route('/notifications', notificationRoutes);
api.route('/dashboard', dashboardRoutes);

api.get('/me', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ user });
});
