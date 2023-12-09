import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("diety", (table) => {
    table.uuid("id").primary();
    table.uuid("sessionid").index();
    table.string("name").notNullable();
    table.string("description").notNullable();
    table.datetime("dateAndHour").notNullable();
    table.boolean("isDiet").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("diety");
}
