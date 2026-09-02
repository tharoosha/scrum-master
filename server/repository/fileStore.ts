import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { DbData, DB_VERSION, emptyDb, type IterationFile, type MasterFile } from './schema.js';
import { withSeed, type Store } from './store.js';

/**
 * Local multi-file JSON store (used for `npm start` / dev):
 *   <dir>/planner.json                     settings, roster, calendar metadata
 *   <dir>/calendars/<loc>.ics              raw uploaded holiday files
 *   <dir>/iterations/iteration-<n>.json    one file per iteration
 *
 * Writes are synchronous + atomic (temp file then rename); only changed files are rewritten,
 * orphaned files are reconciled away.
 */
export class FileStore implements Store {
  /** last serialised content per on-disk file, to skip no-op writes */
  private lastWritten = new Map<string, string>();

  constructor(private readonly dir: string) {}

  static defaultDir(): string {
    return join(process.cwd(), 'data');
  }

  private get masterPath() {
    return join(this.dir, 'planner.json');
  }
  private get iterationsDir() {
    return join(this.dir, 'iterations');
  }
  private get calendarsDir() {
    return join(this.dir, 'calendars');
  }
  private calendarPath(loc: string) {
    return join(this.calendarsDir, `${loc}.ics`);
  }

  private iterationFileName(db: DbData, id: string, number: number): string {
    const same = db.iterations.filter((i) => i.number === number);
    if (same.length <= 1) return `iteration-${number}.json`;
    return same[0]?.id === id ? `iteration-${number}.json` : `iteration-${number}-${id}.json`;
  }

  async load(): Promise<DbData> {
    mkdirSync(this.iterationsDir, { recursive: true });
    mkdirSync(this.calendarsDir, { recursive: true });
    this.lastWritten.clear();
    const data = emptyDb();

    if (existsSync(this.masterPath)) {
      const raw = readFileSync(this.masterPath, 'utf8');
      const m = JSON.parse(raw) as Partial<MasterFile>;
      data.version = DB_VERSION;
      data.settings = { ...emptyDb().settings, ...m.settings };
      data.teamMembers = m.teamMembers ?? [];
      data.holidayCalendars = (m.holidayCalendars ?? []).map((c) => ({
        ...c,
        rawIcs: existsSync(this.calendarPath(c.locationGroup))
          ? readFileSync(this.calendarPath(c.locationGroup), 'utf8')
          : '',
      }));
      this.lastWritten.set(this.masterPath, raw);
      for (const c of data.holidayCalendars) {
        if (existsSync(this.calendarPath(c.locationGroup))) {
          this.lastWritten.set(this.calendarPath(c.locationGroup), c.rawIcs);
        }
      }
    }

    for (const f of readdirSync(this.iterationsDir)) {
      if (!f.endsWith('.json')) continue;
      const raw = readFileSync(join(this.iterationsDir, f), 'utf8');
      const it = JSON.parse(raw) as IterationFile;
      if (!it.iteration) continue;
      data.iterations.push(it.iteration);
      data.iterationParticipants.push(...(it.participants ?? []));
      data.extraAssignments.push(...(it.extraAssignments ?? []));
      data.tasks.push(...(it.tasks ?? []));
      this.lastWritten.set(join(this.iterationsDir, f), raw);
    }

    return withSeed(data);
  }

  async save(db: DbData): Promise<void> {
    mkdirSync(this.iterationsDir, { recursive: true });
    mkdirSync(this.calendarsDir, { recursive: true });

    const master: MasterFile = {
      version: DB_VERSION,
      settings: db.settings,
      teamMembers: db.teamMembers,
      holidayCalendars: db.holidayCalendars.map((c) => ({
        locationGroup: c.locationGroup,
        sourceFileName: c.sourceFileName,
        uploadedAt: c.uploadedAt,
        events: c.events,
      })),
    };
    this.writeIfChanged(this.masterPath, JSON.stringify(master, null, 2));

    const keepCal = new Set<string>();
    for (const c of db.holidayCalendars) {
      const p = this.calendarPath(c.locationGroup);
      keepCal.add(p);
      if (c.rawIcs) this.writeIfChanged(p, c.rawIcs);
    }
    for (const f of readdirSync(this.calendarsDir)) {
      if (f.endsWith('.ics') && !keepCal.has(join(this.calendarsDir, f))) {
        unlinkSync(join(this.calendarsDir, f));
        this.lastWritten.delete(join(this.calendarsDir, f));
      }
    }

    const keep = new Set<string>();
    for (const iteration of db.iterations) {
      const p = join(this.iterationsDir, this.iterationFileName(db, iteration.id, iteration.number));
      keep.add(p);
      const file: IterationFile = {
        iteration,
        participants: db.iterationParticipants.filter((x) => x.iterationId === iteration.id),
        extraAssignments: db.extraAssignments.filter((x) => x.iterationId === iteration.id),
        tasks: db.tasks.filter((x) => x.iterationId === iteration.id),
      };
      this.writeIfChanged(p, JSON.stringify(file, null, 2));
    }
    for (const f of readdirSync(this.iterationsDir)) {
      if (f.endsWith('.json') && !keep.has(join(this.iterationsDir, f))) {
        unlinkSync(join(this.iterationsDir, f));
        this.lastWritten.delete(join(this.iterationsDir, f));
      }
    }
  }

  private writeIfChanged(path: string, content: string): void {
    if (this.lastWritten.get(path) === content) return;
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, content, 'utf8');
    renameSync(tmp, path);
    this.lastWritten.set(path, content);
  }
}
