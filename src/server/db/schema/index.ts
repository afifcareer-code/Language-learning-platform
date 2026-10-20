import * as mysqlSchema from "./mysql";
import * as postgresSchema from "./postgres";
import * as sqliteSchema from "./sqlite";
import type { Dialect } from "../config";

export { mysqlSchema, postgresSchema, sqliteSchema };

/**
 * The table objects used by repositories. All three schemas share table and
 * column names, so the SQLite schema's types describe every dialect.
 */
export type Tables = typeof sqliteSchema;

export function tablesFor(dialect: Dialect): Tables {
  const schemas = { sqlite: sqliteSchema, mysql: mysqlSchema, postgres: postgresSchema };
  return schemas[dialect] as unknown as Tables;
}
