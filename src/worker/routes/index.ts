import { Hono } from 'hono';
import type { AppContext } from '../types';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { areaRoutes } from './areas';
import { areaAssignmentRoutes } from './area-assignments';
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

api.get('/health', (c) =>
  c.json({
    ok: true,
    timestamp: new Date().toISOString(),
  }),
);

// Public routes
api.route('/auth', authRoutes);
api.route('/public', publicRoutes);

// Semua route setelah ini akan membaca session
api.use('/*', authMiddleware);

// Protected routes
api.route('/photos', photoRoutes);
api.route('/users', userRoutes);
api.route('/areas', areaRoutes);
api.route(
  '/area-assignments',
  areaAssignmentRoutes,
);
api.route('/reports', reportRoutes);
api.route('/complaints', complaintRoutes);
api.route('/holidays', holidayRoutes);
api.route('/settings', settingsRoutes);
api.route('/notifications', notificationRoutes);
api.route('/dashboard', dashboardRoutes);

api.get('/me', (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({ user });
});