import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guest: true } },
    { path: '/pengaduan', name: 'complaint-public', component: () => import('../views/PublicComplaintView.vue') },
    {
      path: '/cs',
      meta: { requiresAuth: true, role: 'CS' },
      children: [
        { path: '', name: 'cs-dashboard', component: () => import('../views/cs/DashboardView.vue') },
        { path: 'laporan/baru', name: 'cs-report-new', component: () => import('../views/cs/ReportFormView.vue') },
        { path: 'laporan/:id', name: 'cs-report-detail', component: () => import('../views/cs/ReportFormView.vue') },
        { path: 'draft/:localId', name: 'cs-local-draft', component: () => import('../views/cs/ReportFormView.vue') },
        { path: 'draft', name: 'cs-drafts', component: () => import('../views/cs/DraftsView.vue') },
        { path: 'perbaikan', name: 'cs-revisions', component: () => import('../views/cs/RevisionsView.vue') },
        { path: 'riwayat', name: 'cs-history', component: () => import('../views/cs/HistoryView.vue') },
        { path: 'notifikasi', name: 'cs-notifications', component: () => import('../views/cs/NotificationsView.vue') },
      ],
    },
    {
      path: '/admin',
      meta: { requiresAuth: true, role: 'ADMIN' },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('../views/admin/DashboardView.vue') },
        { path: 'laporan', name: 'admin-reports', component: () => import('../views/admin/ReportsView.vue') },
        { path: 'laporan/:id', name: 'admin-report-detail', component: () => import('../views/admin/ReportDetailView.vue') },
        { path: 'pengaduan', name: 'admin-complaints', component: () => import('../views/admin/ComplaintsView.vue') },
        { path: 'pengguna', name: 'admin-users', component: () => import('../views/admin/UsersView.vue') },
        { path: 'area', name: 'admin-areas', component: () => import('../views/admin/AreasView.vue') },
        { path: 'libur', name: 'admin-holidays', component: () => import('../views/admin/HolidaysView.vue') },
        { path: 'notifikasi', name: 'admin-notifications', component: () => import('../views/admin/NotificationsView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) await auth.fetchSession();

  if (to.meta.guest && auth.isAuthenticated) {
    return auth.isAdmin ? '/admin' : '/cs';
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const requiredRole = to.matched.find((r) => r.meta.role)?.meta.role as string | undefined;
  if (requiredRole && auth.user?.role !== requiredRole) {
    return auth.isAdmin ? '/admin' : auth.isCs ? '/cs' : '/login';
  }

  return true;
});

export default router;
