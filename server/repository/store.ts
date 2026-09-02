import { DbData, emptyDb } from './schema.js';
import { buildSeedMembers } from './seed.js';

/**
 * A Store is the persistence backend for the whole `DbData` document.
 *  - `load()` returns the full state (seeding the roster on first use)
 *  - `save(db)` persists the full state
 * Implementations: FileStore (local disk, multi-file), PostgresStore (hosted), MemoryStore (tests).
 */
export interface Store {
  load(): Promise<DbData>;
  save(db: DbData): Promise<void>;
}

/** Ensures a freshly-loaded db always has a seeded roster. */
export function withSeed(db: DbData): DbData {
  if (db.teamMembers.length === 0) {
    db.teamMembers = buildSeedMembers(db.settings.defaultCapacityPercent);
  }
  return db;
}

/** In-memory store for tests — holds one DbData, no I/O. */
export class MemoryStore implements Store {
  private data: DbData;
  constructor(seed = true) {
    this.data = emptyDb();
    if (seed) withSeed(this.data);
  }
  current(): DbData {
    return this.data;
  }
  async load(): Promise<DbData> {
    return this.data;
  }
  async save(db: DbData): Promise<void> {
    this.data = db;
  }
}
