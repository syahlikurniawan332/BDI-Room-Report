import Dexie, { type EntityTable } from 'dexie';

export interface LocalDraft {
  id: string;
  serverReportId?: string;
  areaId: string;
  areaName: string;
  reporterName: string;
  reporterEmail: string;
  beforeBlob?: Blob;
  beforeCapturedAt?: string;
  afterBlob?: Blob;
  afterCapturedAt?: string;
  createdAt: string;
  updatedAt: string;
}

class DraftDatabase extends Dexie {
  drafts!: EntityTable<LocalDraft, 'id'>;

  constructor() {
    super('bdi-cleaning-drafts');
    this.version(1).stores({
      drafts: 'id, areaId, updatedAt, serverReportId',
    });
  }
}

export const draftDb = new DraftDatabase();

export async function saveDraft(draft: LocalDraft): Promise<void> {
  await draftDb.drafts.put(draft);
}

export async function getDraft(id: string): Promise<LocalDraft | undefined> {
  return draftDb.drafts.get(id);
}

export async function listDrafts(): Promise<LocalDraft[]> {
  return draftDb.drafts.orderBy('updatedAt').reverse().toArray();
}

export async function deleteDraft(id: string): Promise<void> {
  await draftDb.drafts.delete(id);
}

export function createDraftId(): string {
  return `local_${crypto.randomUUID()}`;
}
