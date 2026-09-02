import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { DbData, DB_VERSION, emptyDb } from './schema.js';
import { withSeed, type Store } from './store.js';

/**
 * Hosted store — Neon Postgres (the storage Vercel provisions via its Neon integration).
 * The whole `DbData` document lives in one JSONB row — the data is tiny (one small team),
 * so load = one SELECT, save = one UPSERT. Last write wins.
 *
 * Needs a connection string in the environment. Vercel's Neon integration sets
 * `DATABASE_URL` (and `POSTGRES_URL`); either is picked up here.
 */
export class PostgresStore implements Store {
  private _sql: NeonQueryFunction<false, false> | null = null;
  private schemaReady = false;

  private get sql(): NeonQueryFunction<false, false> {
    if (!this._sql) {
      const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
      if (!url) {
        throw new Error(
          'DATABASE_URL is not set. Connect a Neon Postgres database to the project (see DEPLOY.md).',
        );
      }
      this._sql = neon(url);
    }
    return this._sql;
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    await this.sql`
      CREATE TABLE IF NOT EXISTS planner_state (
        id INT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    this.schemaReady = true;
  }

  async load(): Promise<DbData> {
    await this.ensureSchema();
    const rows = (await this.sql`SELECT data FROM planner_state WHERE id = 1`) as { data: DbData }[];
    if (rows.length === 0) {
      const fresh = withSeed(emptyDb());
      await this.save(fresh);
      return fresh;
    }
    return withSeed({ ...emptyDb(), ...rows[0]!.data, version: DB_VERSION });
  }

  async save(db: DbData): Promise<void> {
    await this.ensureSchema();
    await this.sql`
      INSERT INTO planner_state (id, data, updated_at)
      VALUES (1, ${JSON.stringify(db)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `;
  }
}
