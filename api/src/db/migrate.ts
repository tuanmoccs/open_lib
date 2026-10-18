import path from 'node:path';
import type { Db } from './knex';

// Migrations are compiled to .js in production and run as .ts in development (tsx).
const extension = path.extname(__filename);

export async function runMigrations(db: Db) {
  const [batch, applied] = await db.migrate.latest({
    directory: path.join(__dirname, 'migrations'),
    loadExtensions: [extension],
  });
  return { batch: batch as number, applied: applied as string[] };
}
