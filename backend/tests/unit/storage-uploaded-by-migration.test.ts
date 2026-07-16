import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(
  currentDir,
  '../../src/infra/database/migrations/012_add-storage-uploaded-by.sql'
);

describe('012_add-storage-uploaded-by migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('adds uploaded_by with IF NOT EXISTS so re-application cannot fail', () => {
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES _accounts\(id\) ON DELETE SET NULL/i
    );
  });

  it('has no unguarded ADD COLUMN', () => {
    expect(sql).not.toMatch(/ADD COLUMN (?!IF NOT EXISTS)/i);
  });

  it('keeps the index guarded', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_storage_uploaded_by/i);
  });
});
