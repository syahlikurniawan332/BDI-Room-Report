<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiGet, apiPatch, apiPost } from '../../lib/api';

interface User {
  id: string;
  displayName: string;
  username: string;
  role: string;
  isActive: boolean;
}

interface Area {
  id: string;
  name: string;
  isActive: boolean;
}

interface Assignment {
  id: string;
  user_id: string;
  area_id: string;
  assigned_from: string;
  assigned_until: string | null;
  is_active: number;
  user_name: string;
  username: string;
  area_name: string;
}

const users = ref<User[]>([]);
const areas = ref<Area[]>([]);
const assignments = ref<Assignment[]>([]);

const selectedUserId = ref('');
const selectedAreaId = ref('');

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const success = ref('');

const csUsers = computed(() =>
  users.value.filter(
    (user) => user.role === 'CS' && user.isActive,
  ),
);

const selectedUser = computed(() =>
  csUsers.value.find(
    (user) => user.id === selectedUserId.value,
  ),
);

const selectedAssignments = computed(() =>
  assignments.value.filter(
    (assignment) =>
      assignment.user_id === selectedUserId.value &&
      assignment.is_active === 1,
  ),
);

const assignedAreaIds = computed(
  () =>
    new Set(
      assignments.value
        .filter((assignment) => assignment.is_active === 1)
        .map((assignment) => assignment.area_id),
    ),
);

const availableAreas = computed(() =>
  areas.value.filter(
    (area) =>
      area.isActive &&
      !assignedAreaIds.value.has(area.id),
  ),
);

async function load() {
  loading.value = true;
  error.value = '';

  try {
    const [usersResponse, areasResponse, assignmentsResponse] =
      await Promise.all([
        apiGet<{ users: User[] }>('/users'),
        apiGet<{ areas: Area[] }>('/areas'),
        apiGet<{ assignments: Assignment[] }>(
          '/area-assignments',
        ),
      ]);

    users.value = usersResponse.users;
    areas.value = areasResponse.areas;
    assignments.value = assignmentsResponse.assignments;

    if (
      !selectedUserId.value &&
      csUsers.value.length > 0
    ) {
      selectedUserId.value = csUsers.value[0].id;
    }
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal mengambil data penugasan.';
  } finally {
    loading.value = false;
  }
}

async function assignArea() {
  if (!selectedUserId.value || !selectedAreaId.value) {
    error.value = 'Pilih CS dan area terlebih dahulu.';
    return;
  }

  saving.value = true;
  error.value = '';
  success.value = '';

  try {
    await apiPost('/area-assignments', {
      userId: selectedUserId.value,
      areaId: selectedAreaId.value,
    });

    success.value = 'Area berhasil ditugaskan.';
    selectedAreaId.value = '';

    await load();
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal menambahkan penugasan.';
  } finally {
    saving.value = false;
  }
}

async function releaseAssignment(
  assignment: Assignment,
) {
  const confirmed = window.confirm(
    `Lepaskan ${assignment.area_name} dari ${assignment.user_name}?`,
  );

  if (!confirmed) {
    return;
  }

  saving.value = true;
  error.value = '';
  success.value = '';

  try {
    await apiPatch(
      `/area-assignments/${assignment.id}`,
      {
        isActive: false,
      },
    );

    success.value = 'Penugasan berhasil dilepaskan.';

    await load();
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Gagal melepaskan penugasan.';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1
        class="text-2xl font-bold text-slate-900 dark:text-slate-100"
      >
        Penugasan Area
      </h1>

      <p
        class="mt-1 text-sm text-slate-600 dark:text-slate-400"
      >
        Atur area kebersihan yang menjadi tanggung jawab
        masing-masing Cleaning Service.
      </p>
    </div>

    <p
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ error }}
    </p>

    <p
      v-if="success"
      class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
    >
      {{ success }}
    </p>

    <div
      v-if="loading"
      class="card text-sm text-slate-500 dark:text-slate-400"
    >
      Memuat penugasan...
    </div>

    <template v-else>
      <!-- Pilih CS -->
      <section class="card">
        <label class="label">
          Cleaning Service
        </label>

        <select
          v-model="selectedUserId"
          class="input mt-1"
        >
          <option
            v-for="user in csUsers"
            :key="user.id"
            :value="user.id"
          >
            {{ user.displayName }} ({{ user.username }})
          </option>
        </select>
      </section>

      <!-- Area CS -->
      <section class="card space-y-4">
        <div
          class="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <h2
              class="font-semibold text-slate-900 dark:text-slate-100"
            >
              Area Tugas
              <template v-if="selectedUser">
                — {{ selectedUser.displayName }}
              </template>
            </h2>

            <p
              class="mt-1 text-sm text-slate-500 dark:text-slate-400"
            >
              {{ selectedAssignments.length }}
              area sedang ditugaskan.
            </p>
          </div>
        </div>

        <div
          v-if="selectedAssignments.length === 0"
          class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
        >
          Belum ada area yang ditugaskan kepada CS ini.
        </div>

        <div
          v-else
          class="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700"
        >
          <div
            v-for="assignment in selectedAssignments"
            :key="assignment.id"
            class="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div class="min-w-0">
              <p
                class="font-medium text-slate-900 dark:text-slate-100"
              >
                {{ assignment.area_name }}
              </p>

              <p
                class="text-xs text-slate-500 dark:text-slate-400"
              >
                Penugasan aktif
              </p>
            </div>

            <button
              type="button"
              class="shrink-0 text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50 dark:text-red-400"
              :disabled="saving"
              @click="releaseAssignment(assignment)"
            >
              Lepaskan
            </button>
          </div>
        </div>
      </section>

      <!-- Tambah Assignment -->
      <section class="card space-y-4">
        <div>
          <h2
            class="font-semibold text-slate-900 dark:text-slate-100"
          >
            Tambah Area
          </h2>

          <p
            class="mt-1 text-sm text-slate-500 dark:text-slate-400"
          >
            Hanya area yang belum ditugaskan kepada CS lain
            yang tersedia.
          </p>
        </div>

        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div class="flex-1">
            <label class="label">
              Area Kebersihan
            </label>

            <select
              v-model="selectedAreaId"
              class="input mt-1"
            >
              <option value="">
                Pilih area
              </option>

              <option
                v-for="area in availableAreas"
                :key="area.id"
                :value="area.id"
              >
                {{ area.name }}
              </option>
            </select>
          </div>

          <button
            type="button"
            class="btn-primary sm:shrink-0"
            :disabled="
              saving ||
              !selectedUserId ||
              !selectedAreaId
            "
            @click="assignArea"
          >
            {{ saving ? 'Menyimpan...' : 'Tambahkan' }}
          </button>
        </div>

        <p
          v-if="availableAreas.length === 0"
          class="text-sm text-slate-500 dark:text-slate-400"
        >
          Semua area aktif sudah memiliki penugasan.
        </p>
      </section>
    </template>
  </div>
</template>