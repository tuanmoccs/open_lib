import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('books', (table) => {
    table.increments('id').primary();
    // Open Library work id, e.g. "OL27482W"
    table.string('work_id', 32).notNullable().unique();
    table.string('title', 500).notNullable();
    table.json('authors').notNullable();
    table.integer('cover_id').unsigned().nullable();
    table.smallint('first_publish_year').nullable();
    table.integer('number_of_pages').unsigned().nullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('books');
}
