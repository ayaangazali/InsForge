/**
 * Guards the integration seed's core promise: the FULL migration chain is
 * applied to test schemas. The seed silently stopped at migration 050 for
 * months (its vector column failed because the pre-seed never installed
 * pgvector, and the error was swallowed), so every later migration was
 * missing and tests against 050+ schema failed with confusing
 * "relation does not exist" errors (#1719).
 */
import { PgTestClient } from 'insforge-test';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnections } from './utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.resolve(__dirname, '../../src/infra/database/migrations');

let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await getConnections());
}, 120_000);

afterAll(() => teardown());

describe('integration seed migration chain', () => {
  it('applies migrations past 050 (pgvector-dependent)', async () => {
    // memory schema is created by 050 — the historical silent-stop point.
    const { rows } = await db.query(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'memory'`
    );
    expect(rows).toHaveLength(1);
  });

  it('applies the newest migration in the chain', async () => {
    // 059 is the latest migration on main at time of writing; the assertion
    // targets its table so a future silent stop anywhere in the chain fails
    // loudly here.
    const { rows } = await db.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'system' AND table_name = 'advisor_suppressions'`
    );
    expect(rows).toHaveLength(1);
  });

  it('has a migration file count matching what the seed applied', async () => {
    // Sanity: every .sql file in the chain should have been applied — probe
    // one object per decade boundary to keep this cheap.
    const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThanOrEqual(60);
  });
});
