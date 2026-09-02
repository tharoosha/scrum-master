import { DbData, emptyDb } from './schema.js';
import { FileStore } from './fileStore.js';
import { MemoryStore, type Store } from './store.js';

/**
 * Repository — the in-memory `DbData` the services read and mutate, backed by a `Store`.
 *
 * Lifecycle per request (see server/api/index.ts persistence middleware):
 *   1. `await repo.load()`   — pull the current state from the store
 *   2. services mutate `repo.db` in place and call `repo.save()` (which just marks it dirty)
 *   3. `await repo.flush()`  — write back if anything changed, before the response is sent
 */
export class Repository {
  private data: DbData = emptyDb();
  private loaded = false;
  private dirty = false;

  constructor(private readonly store: Store) {}

  /** Load the current state from the store. Safe to call before every request. */
  async load(): Promise<void> {
    this.data = await this.store.load();
    this.loaded = true;
    this.dirty = false;
  }

  get db(): DbData {
    if (!this.loaded) throw new Error('Repository.load() not called');
    return this.data;
  }

  /** Test helper: set the in-memory state synchronously (no store round-trip). */
  _prime(db: DbData): void {
    this.data = db;
    this.loaded = true;
    this.dirty = false;
  }

  /** Called by services after a mutation — records that a flush is needed. */
  save(): void {
    this.dirty = true;
  }

  /** Persist if there were mutations since the last load. */
  async flush(): Promise<void> {
    if (!this.dirty) return;
    await this.store.save(this.data);
    this.dirty = false;
  }
}

let singleton: Repository | null = null;

/** Pick the store from the environment: Postgres when `POSTGRES_URL` is set, else local files. */
export async function getRepository(): Promise<Repository> {
  if (!singleton) {
    let store: Store;
    if (process.env.DATABASE_URL ?? process.env.POSTGRES_URL) {
      const { PostgresStore } = await import('./postgresStore.js');
      store = new PostgresStore();
    } else {
      store = new FileStore(FileStore.defaultDir());
    }
    singleton = new Repository(store);
    await singleton.load();
  }
  return singleton;
}

/** For tests: an initialised repository backed by an in-memory store. */
export function makeInMemoryRepository(seed = true): Repository {
  const store = new MemoryStore(seed);
  const repo = new Repository(store);
  repo._prime(store.current());
  return repo;
}
