import knex, { type Knex } from 'knex';
import type { Env } from '../config/env';

export function createDb(
  env: Pick<Env, 'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME'>,
) {
  return knex({
    client: 'mysql2',
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      // Store and read every DATETIME as UTC.
      timezone: 'Z',
      charset: 'utf8mb4',
    },
    pool: { min: 0, max: 10 },
  });
}

export type Db = Knex;
