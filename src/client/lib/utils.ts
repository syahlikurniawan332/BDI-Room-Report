import { formatWib } from '@shared/datetime';
import type { ReportStatus, ComplaintStatus } from '@shared/constants';

export { formatWib };

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu Review',
  REVISION_REQUIRED: 'Perlu Perbaikan',
  RESUBMITTED: 'Dikirim Ulang',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: 'Baru',
  IN_PROGRESS: 'Diproses',
  WAITING_VERIFICATION: 'Menunggu Verifikasi',
  RESOLVED: 'Selesai',
  REJECTED: 'Ditolak',
};

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    RESUBMITTED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
    REVISION_REQUIRED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

export async function downloadReportZip(
  report: {
    reportNumber: string;
    areaName?: string;
    reporterName: string;
    submittedAt: string | null;
    photos?: Array<{ id: string; photoType: string }>;
  },
): Promise<void> {
  await downloadReportsZip([{ id: '', ...report }], 10);
}

export async function downloadReportsZip(
  reports: Array<{
    id: string;
    reportNumber: string;
    areaName?: string;
    reporterName: string;
    submittedAt: string | null;
    photos?: Array<{ id: string; photoType: string }>;
  }>,
  maxPhotos = 100,
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  let photoCount = 0;

  for (const report of reports) {
    const folder = zip.folder(report.reportNumber);
    if (!folder) continue;
    folder.file(
      'metadata.json',
      JSON.stringify(
        {
          reportNumber: report.reportNumber,
          area: report.areaName,
          reporter: report.reporterName,
          submittedAt: report.submittedAt,
        },
        null,
        2,
      ),
    );

    for (const photo of report.photos ?? []) {
      if (photoCount >= maxPhotos) break;
      const response = await fetch(`/api/photos/reports/${photo.id}`, { credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        folder.file(`${photo.photoType.toLowerCase()}.webp`, blob);
        photoCount++;
      }
    }
    if (photoCount >= maxPhotos) break;
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
