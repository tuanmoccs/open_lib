import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shelf_entries', (table) => {
    table.increments('id').primary();
    // UNIQUE: a book can only be on the shelf once (duplicates -> 409).
    table
      .integer('book_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('books')
      .onDelete('CASCADE');
    table.enum('status', ['want_to_read', 'reading', 'read']).notNullable();
    table.integer('current_page').unsigned().notNullable().defaultTo(0);
    // Copied from the book when added; the user can fill it in when Open Library has no value.
    table.integer('total_pages').unsigned().nullable();
    table.tinyint('rating').unsigned().nullable();
    table.string('note', 500).nullable();
    table.dateTime('started_at').nullable();
    table.dateTime('finished_at').nullable();
    table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['status']);
  });

  // Last line of defence; the API validates the same rules first.
  await knex.raw(`
    ALTER TABLE shelf_entries
      ADD CONSTRAINT chk_shelf_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
      ADD CONSTRAINT chk_shelf_total_pages CHECK (total_pages IS NULL OR total_pages > 0),
      ADD CONSTRAINT chk_shelf_current_page CHECK (total_pages IS NULL OR current_page <= total_pages)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shelf_entries');
}
