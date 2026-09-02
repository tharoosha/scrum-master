import type {
  ExpenseCategory,
  JiraImportIssue,
  JiraIssueSummary,
  JiraSprint,
  JiraSprintImport,
  JiraStatus,
} from '../../shared/types.js';
import { NotFoundError, ValidationError, AppError } from '../errors.js';

const KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;
/** name of the Jira custom field that flags capital expenditure */
const CAPEX_FIELD_NAME = 'capex';

/**
 * JiraService — reads issue titles / Capex flags and imports a sprint's issues.
 * Configured via environment variables (loaded from .env at server start):
 *   JIRA_BASE_URL   e.g. https://adramatch.jira.com  or  https://adramatch.atlassian.net
 *   JIRA_EMAIL      the Atlassian account email
 *   JIRA_API_TOKEN  an API token from id.atlassian.com/manage-profile/security/api-tokens
 *   JIRA_BOARD_ID   the agile board the sprint import reads from (e.g. 27)
 *
 * Jira Cloud returns 404 ("does not exist or you do not have permission") for BOTH a
 * missing issue and a failed/insufficient auth, so on a 404 we probe /myself to tell
 * the two apart and give a useful message.
 */
export class JiraService {
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly token: string;
  readonly boardId: number | null;

  /** resolved id of the "Capex" custom field, cached after the first lookup */
  private capexFieldId: string | null | undefined = undefined;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = (env.JIRA_BASE_URL ?? '').trim().replace(/\/+$/, '');
    this.email = (env.JIRA_EMAIL ?? '').trim();
    // API tokens are often pasted with a trailing newline / stray whitespace.
    this.token = (env.JIRA_API_TOKEN ?? '').trim();
    const b = Number((env.JIRA_BOARD_ID ?? '').trim());
    this.boardId = Number.isInteger(b) && b > 0 ? b : null;
  }

  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.email && this.token);
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`;
  }

  private async call(path: string): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
  }

  /** An HTML response means the base URL points at a web page, not the Jira API. */
  private static isHtml(res: Response): boolean {
    return (res.headers.get('content-type') ?? '').toLowerCase().includes('html');
  }

  private badBaseUrl(): AppError {
    return new AppError(
      `JIRA_BASE_URL (${this.baseUrl}) doesn't look like a Jira site — it returned a web page, ` +
        `not the API. Use your Jira URL exactly as it appears in the browser, e.g. ` +
        `https://your-site.atlassian.net or https://your-site.jira.com`,
      502,
      'jira_bad_base_url',
    );
  }

  private notConfigured(): AppError {
    return new AppError(
      'Jira is not configured — set JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN in .env',
      501,
      'jira_not_configured',
    );
  }

  /** true if the credentials authenticate against this site. */
  private async checkAuth(): Promise<{ ok: boolean; label?: string; badBaseUrl?: boolean }> {
    try {
      const res = await this.call('/rest/api/3/myself');
      if (JiraService.isHtml(res)) return { ok: false, badBaseUrl: true };
      if (res.ok) {
        const me = (await res.json()) as { displayName?: string; emailAddress?: string };
        return { ok: true, label: me.displayName ?? me.emailAddress };
      }
      if (res.status === 401 || res.status === 403) return { ok: false };
      return { ok: false, badBaseUrl: true };
    } catch {
      return { ok: false };
    }
  }

  /** GET a Jira endpoint as JSON, mapping every failure to a typed, actionable error. */
  private async getJson<T>(path: string, notFoundLabel?: string): Promise<T> {
    if (!this.isConfigured) throw this.notConfigured();
    let res: Response;
    try {
      res = await this.call(path);
    } catch {
      throw new AppError(`Could not reach Jira at ${this.baseUrl}`, 502, 'jira_unreachable');
    }
    if (JiraService.isHtml(res)) throw this.badBaseUrl();
    if (res.status === 401 || res.status === 403) {
      throw new AppError(
        'Jira rejected the credentials — check JIRA_EMAIL and JIRA_API_TOKEN in .env',
        502,
        'jira_auth_failed',
      );
    }
    if (res.status === 404) {
      const auth = await this.checkAuth();
      if (auth.badBaseUrl) throw this.badBaseUrl();
      if (!auth.ok) {
        throw new AppError(
          'Jira rejected the credentials — check JIRA_EMAIL and JIRA_API_TOKEN in .env',
          502,
          'jira_auth_failed',
        );
      }
      throw new NotFoundError(notFoundLabel ?? `Jira resource ${path}`);
    }
    if (!res.ok) throw new AppError(`Jira returned ${res.status} for ${path}`, 502, 'jira_error');
    return (await res.json()) as T;
  }

  async status(): Promise<JiraStatus> {
    if (!this.isConfigured) {
      return {
        configured: false,
        baseUrl: this.baseUrl || null,
        authenticated: false,
        accountLabel: null,
        problem: null,
        boardId: this.boardId,
      };
    }
    const auth = await this.checkAuth();
    return {
      configured: true,
      baseUrl: this.baseUrl,
      authenticated: auth.ok,
      accountLabel: auth.label ?? null,
      boardId: this.boardId,
      problem: auth.ok
        ? this.boardId
          ? null
          : 'set JIRA_BOARD_ID in .env to enable sprint import'
        : auth.badBaseUrl
          ? `JIRA_BASE_URL (${this.baseUrl}) is not a Jira API — check the URL`
          : 'the credentials were rejected — check JIRA_EMAIL / JIRA_API_TOKEN',
    };
  }

  static isValidKey(key: string): boolean {
    return KEY_RE.test(key.trim().toUpperCase());
  }

  /** Look up the id of the "Capex" custom field once; null if the field doesn't exist. */
  private async resolveCapexFieldId(): Promise<string | null> {
    if (this.capexFieldId !== undefined) return this.capexFieldId;
    try {
      const fields = await this.getJson<{ id: string; name: string }[]>('/rest/api/3/field');
      const match = fields.find((f) => f.name?.trim().toLowerCase() === CAPEX_FIELD_NAME);
      this.capexFieldId = match?.id ?? null;
    } catch {
      this.capexFieldId = null;
    }
    return this.capexFieldId;
  }

  /** Map the Jira "Capex" field value to a category. "Yes" -> Capex; anything else / blank -> Opex. */
  private static categoryFromCapexField(raw: unknown): ExpenseCategory {
    let text: string | undefined;
    if (typeof raw === 'string') text = raw;
    else if (raw && typeof raw === 'object' && 'value' in raw) text = String((raw as { value: unknown }).value);
    else if (Array.isArray(raw) && raw.length) text = String(raw[0]);
    return text?.trim().toLowerCase() === 'yes' ? 'Capex' : 'Opex';
  }

  private static toDateOnly(iso: string | null | undefined): string | null {
    return iso ? iso.slice(0, 10) : null;
  }

  // -------------------------------------------------------------------------
  // Single-issue lookup (task title auto-fill)
  // -------------------------------------------------------------------------

  async getIssueSummary(rawKey: string): Promise<JiraIssueSummary> {
    const key = rawKey.trim().toUpperCase();
    if (!JiraService.isValidKey(key)) {
      throw new ValidationError(`"${rawKey}" is not a Jira issue key (expected e.g. AB-12510)`);
    }
    const capexFieldId = await this.resolveCapexFieldId();
    const fieldList = capexFieldId ? `summary,${capexFieldId}` : 'summary';
    const body = await this.getJson<{ fields?: Record<string, unknown> }>(
      `/rest/api/3/issue/${encodeURIComponent(key)}?fields=${fieldList}`,
      `Jira issue ${key} (check the key or your project access)`,
    );
    const summary = typeof body.fields?.summary === 'string' ? body.fields.summary.trim() : '';
    if (!summary) throw new AppError('Jira issue has no summary', 502, 'jira_error');
    const category: ExpenseCategory | null = capexFieldId
      ? JiraService.categoryFromCapexField(body.fields?.[capexFieldId])
      : null;
    return { key, summary, category };
  }

  // -------------------------------------------------------------------------
  // Sprint import
  // -------------------------------------------------------------------------

  private requireBoard(): number {
    if (!this.isConfigured) throw this.notConfigured();
    if (!this.boardId) {
      throw new AppError(
        'Sprint import needs JIRA_BOARD_ID in .env (the number in your board URL, e.g. .../boards/27)',
        501,
        'jira_no_board',
      );
    }
    return this.boardId;
  }

  /** All sprints on the configured board (active, future and closed), newest first. */
  async listSprints(): Promise<JiraSprint[]> {
    const board = this.requireBoard();
    const out: JiraSprint[] = [];
    let startAt = 0;
    for (;;) {
      const page = await this.getJson<{
        maxResults: number;
        isLast: boolean;
        values: { id: number; name: string; state: string; startDate?: string; endDate?: string }[];
      }>(
        `/rest/agile/1.0/board/${board}/sprint?state=active,future,closed&startAt=${startAt}&maxResults=50`,
        `Jira board ${board} (check JIRA_BOARD_ID and your board access)`,
      );
      for (const s of page.values) {
        out.push({
          id: s.id,
          name: s.name,
          state: s.state,
          startDate: JiraService.toDateOnly(s.startDate),
          endDate: JiraService.toDateOnly(s.endDate),
        });
      }
      if (page.isLast || page.values.length === 0) break;
      startAt += page.values.length;
    }
    return out.sort((a, b) => b.id - a.id);
  }

  /** Find a sprint by exact name, else by "contains" (case-insensitive). */
  async findSprint(nameOrNumber: string): Promise<JiraSprint> {
    const q = nameOrNumber.trim().toLowerCase();
    const sprints = await this.listSprints();
    const exact = sprints.find((s) => s.name.trim().toLowerCase() === q);
    if (exact) return exact;
    const contains = sprints.filter((s) => s.name.toLowerCase().includes(q));
    if (contains.length === 1) return contains[0]!;
    if (contains.length > 1) {
      throw new ValidationError(
        `"${nameOrNumber}" matches ${contains.length} sprints (${contains.map((s) => s.name).join(', ')}) — be more specific`,
      );
    }
    throw new NotFoundError(
      `Sprint "${nameOrNumber}" on board ${this.boardId} (available: ${sprints.slice(0, 8).map((s) => s.name).join(', ')})`,
    );
  }

  /** The sprint's issues, ready to become tasks. */
  async getSprintImport(nameOrNumber: string): Promise<JiraSprintImport> {
    this.requireBoard();
    const sprint = await this.findSprint(nameOrNumber);
    const capexFieldId = await this.resolveCapexFieldId();
    const fields = ['summary', 'issuetype', 'timetracking', capexFieldId].filter(Boolean).join(',');

    const issues: JiraImportIssue[] = [];
    let startAt = 0;
    for (;;) {
      const page = await this.getJson<{
        total: number;
        issues: {
          key: string;
          fields: {
            summary?: string;
            issuetype?: { name?: string };
            timetracking?: { originalEstimateSeconds?: number };
          } & Record<string, unknown>;
        }[];
      }>(
        `/rest/agile/1.0/sprint/${sprint.id}/issue?fields=${fields}&startAt=${startAt}&maxResults=50`,
        `Jira sprint ${sprint.name}`,
      );
      for (const is of page.issues) {
        const seconds = is.fields.timetracking?.originalEstimateSeconds ?? 0;
        issues.push({
          key: is.key,
          summary: (is.fields.summary ?? '').trim() || is.key,
          category: capexFieldId
            ? JiraService.categoryFromCapexField(is.fields[capexFieldId])
            : null,
          estimateHours: Math.round((seconds / 3600) * 100) / 100,
          issueType: is.fields.issuetype?.name ?? 'Issue',
        });
      }
      startAt += page.issues.length;
      if (page.issues.length === 0 || startAt >= page.total) break;
    }
    return { sprint, issues };
  }
}
