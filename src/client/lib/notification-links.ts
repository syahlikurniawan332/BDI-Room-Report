import type { UserRole } from '@shared/constants';

export function notificationEntityLink(
  role: UserRole | undefined,
  type: string | null,
  id: string | null,
): string | null {
  if (!role || !type || !id) return null;

  if (type === 'report') {
    return role === 'ADMIN' ? `/admin/laporan/${id}` : `/cs/laporan/${id}`;
  }

  if (type === 'complaint') {
    return role === 'ADMIN' ? '/admin/pengaduan' : '/cs/pengaduan';
  }

  return null;
}
