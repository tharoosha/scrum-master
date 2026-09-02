import type {
  AllocationResult,
  CalendarSummary,
  CapacityResult,
  ExtraAssignment,
  IterationDetail,
  IterationParticipant,
  IterationSummary,
  ImportJiraRequest,
  JiraIssueSummary,
  JiraSprint,
  JiraSprintImport,
  JiraStatus,
  NewExtraAssignment,
  NewIteration,
  NewTask,
  NewTeamMember,
  ParticipantPatch,
  ReportRow,
  Settings,
  Task,
  TaskAssignment,
  TaskPatch,
  TeamMember,
} from '@shared/types.js';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { message?: string }).message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const api = {
  // members
  listMembers: () => req<TeamMember[]>('/members'),
  createMember: (m: NewTeamMember) => req<TeamMember>('/members', { method: 'POST', body: JSON.stringify(m) }),
  updateMember: (id: string, patch: Partial<TeamMember>) =>
    req<TeamMember>(`/members/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deactivateMember: (id: string) => req<TeamMember>(`/members/${id}/deactivate`, { method: 'POST' }),
  setScrumMaster: (id: string) => req<TeamMember[]>(`/members/${id}/scrum-master`, { method: 'POST' }),

  // settings
  getSettings: () => req<Settings>('/settings'),
  updateSettings: (patch: Partial<Settings>) =>
    req<Settings>('/settings', { method: 'PUT', body: JSON.stringify(patch) }),

  // calendars
  getCalendars: () => req<CalendarSummary[]>('/calendars'),
  uploadCalendar: async (location: 'SL' | 'MY', file: File) => {
    const ics = await file.text();
    return req<CalendarSummary>(`/calendars/${location}`, {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, ics }),
    });
  },

  // iterations
  listIterations: () => req<IterationSummary[]>('/iterations'),
  createIteration: (i: NewIteration) =>
    req<IterationDetail>('/iterations', { method: 'POST', body: JSON.stringify(i) }),
  getIteration: (id: string) => req<IterationDetail>(`/iterations/${id}`),
  updateIteration: (id: string, patch: Record<string, unknown>) =>
    req<IterationDetail>(`/iterations/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteIteration: (id: string) => req<void>(`/iterations/${id}`, { method: 'DELETE' }),
  getCapacity: (id: string) => req<CapacityResult>(`/iterations/${id}/capacity`),
  getAllocation: (id: string) => req<AllocationResult>(`/iterations/${id}/allocation`),
  setParticipant: (id: string, pid: string, patch: ParticipantPatch) =>
    req<IterationParticipant>(`/iterations/${id}/members/${pid}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  addExtraAssignment: (id: string, ea: NewExtraAssignment) =>
    req<ExtraAssignment>(`/iterations/${id}/extra-assignments`, {
      method: 'POST',
      body: JSON.stringify(ea),
    }),
  updateExtraAssignment: (id: string, eaId: string, patch: Record<string, unknown>) =>
    req<ExtraAssignment>(`/iterations/${id}/extra-assignments/${eaId}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  deleteExtraAssignment: (id: string, eaId: string) =>
    req<void>(`/iterations/${id}/extra-assignments/${eaId}`, { method: 'DELETE' }),
  exportUrl: (id: string) => `${BASE}/iterations/${id}/export`,

  // tasks
  listTasks: (id: string) => req<Task[]>(`/iterations/${id}/tasks`),
  createTask: (id: string, t: NewTask) =>
    req<Task>(`/iterations/${id}/tasks`, { method: 'POST', body: JSON.stringify(t) }),
  updateTask: (taskId: string, patch: TaskPatch) =>
    req<Task>(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteTask: (taskId: string) => req<void>(`/tasks/${taskId}`, { method: 'DELETE' }),
  assignTask: (taskId: string, a: TaskAssignment) =>
    req<Task>(`/tasks/${taskId}/assign`, { method: 'PUT', body: JSON.stringify(a) }),

  // report
  getReport: () => req<ReportRow[]>('/report'),

  // jira
  jiraStatus: () => req<JiraStatus>('/jira/status'),
  lookupJira: (key: string) => req<JiraIssueSummary>(`/jira/issue/${encodeURIComponent(key)}`),
  listSprints: () => req<JiraSprint[]>('/jira/sprints'),
  previewSprint: (name: string) =>
    req<JiraSprintImport>(`/jira/sprint-preview?name=${encodeURIComponent(name)}`),
  importSprint: (body: ImportJiraRequest) =>
    req<{ iteration: IterationDetail; sprint: JiraSprint; importedTaskCount: number; withoutEstimate: number }>(
      '/iterations/import-jira',
      { method: 'POST', body: JSON.stringify(body) },
    ),
};
