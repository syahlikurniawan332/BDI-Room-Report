import { Hono } from 'hono';
import type { AppContext } from '../types';
import { toWibDateString } from '@shared/datetime';
import { requireAdmin, requireCs } from '../middleware/auth';

export const dashboardRoutes = new Hono<AppContext>();

dashboardRoutes.get('/cs', async (c) => {
  const cs = requireCs(c);
  if (!cs) return c.json({ error: 'Forbidden' }, 403);

  const counts = await c.env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status IN ('SUBMITTED', 'RESUBMITTED') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'REVISION_REQUIRED' THEN 1 ELSE 0 END) AS revision,
       SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved
     FROM reports WHERE user_id = ?`,
  )
    .bind(cs.id)
    .first<{ drafts: number; pending: number; revision: number; approved: number }>();

  return c.json({
    stats: {
      drafts: counts?.drafts ?? 0,
      pending: counts?.pending ?? 0,
      revision: counts?.revision ?? 0,
      approved: counts?.approved ?? 0,
    },
  });
});

dashboardRoutes.get('/admin', async (c) => {
  const admin = requireAdmin(c);
  if (!admin) return c.json({ error: 'Forbidden' }, 403);

  const todayWib = toWibDateString();

  const counts = await c.env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status IN ('SUBMITTED', 'RESUBMITTED') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'REVISION_REQUIRED' THEN 1 ELSE 0 END) AS revision,
       SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS drafts
     FROM reports`,
  ).first<{
    pending: number;
    revision: number;
    approved: number;
    rejected: number;
    drafts: number;
  }>();

  const todayRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count FROM reports
     WHERE submitted_at IS NOT NULL
       AND date(submitted_at, '+7 hours') = ?`,
  )
    .bind(todayWib)
    .first<{ count: number }>();

  const newComplaints = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count FROM complaints WHERE status = 'NEW'`,
  ).first<{ count: number }>();

  const csActivity = await c.env.DB.prepare(
    `SELECT
     u.id,
     u.display_name,
     u.username,

     (
       SELECT r.submitted_at
       FROM reports r
       WHERE r.user_id = u.id
         AND r.submitted_at IS NOT NULL
       ORDER BY r.submitted_at DESC
       LIMIT 1
     ) AS last_submitted,

     (
       SELECT r.status
       FROM reports r
       WHERE r.user_id = u.id
         AND r.submitted_at IS NOT NULL
       ORDER BY r.submitted_at DESC
       LIMIT 1
     ) AS last_status

   FROM users u
   WHERE u.role = 'CS'
     AND u.is_active = 1
   ORDER BY u.display_name ASC`,
  ).all<{
    id: string;
    display_name: string;
    username: string;
    last_submitted: string | null;
    last_status: string | null;
  }>();

  const notReportedToday = await c.env.DB.prepare(
    `SELECT COUNT(*) AS count
   FROM users u
   WHERE u.role = 'CS'
     AND u.is_active = 1
     AND NOT EXISTS (
       SELECT 1
       FROM reports r
       WHERE r.user_id = u.id
         AND r.submitted_at IS NOT NULL
         AND date(r.submitted_at, '+7 hours') = ?
     )`,
  )
    .bind(todayWib)
    .first<{ count: number }>();

  return c.json({
    stats: {
      todayReports: todayRow?.count ?? 0,
      pending: counts?.pending ?? 0,
      revision: counts?.revision ?? 0,
      approved: counts?.approved ?? 0,
      rejected: counts?.rejected ?? 0,
      newComplaints: newComplaints?.count ?? 0,
      notReportedToday: notReportedToday?.count ?? 0,
    },
    csActivity: (csActivity.results ?? []).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      username: row.username,
      lastSubmittedAt: row.last_submitted,
      lastStatus: row.last_status,
    })),
  });
});
