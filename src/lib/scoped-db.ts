import { and, eq, getTableColumns, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Db } from "@/db";

/**
 * A Drizzle pg table constrained to `PgTable` only, so Drizzle keeps inferring
 * row shapes (`$inferSelect`) for `select()` results. The `id` / `householdId`
 * columns are read at runtime via `getTableColumns` — pass a table without them
 * and the query throws rather than silently skipping the household filter.
 */
type TenantTable = PgTable;

function columnsOf(table: TenantTable): {
  id: AnyPgColumn;
  householdId: AnyPgColumn;
} {
  const cols = getTableColumns(table) as Record<string, AnyPgColumn>;
  if (!cols.householdId) {
    throw new Error(
      "scopedDb used on a table without a householdId column — use raw db instead",
    );
  }
  return { id: cols.id, householdId: cols.householdId };
}

/**
 * A thin wrapper that binds a household id to the query builder so the
 * `household_id` filter can't be forgotten.
 *
 * Rule for the codebase: never call `db.select().from(<tenant table>)`
 * directly. Go through `scoped.*`, or — for aggregate queries that can't be
 * expressed here — take an explicit `householdId` param and put
 * `eq(table.householdId, householdId)` in the WHERE yourself.
 */
export class ScopedDb {
  constructor(
    /** Raw handle — escape hatch for aggregates and multi-table joins. */
    readonly db: Db,
    readonly householdId: string,
  ) {}

  private scope(table: TenantTable, extra?: SQL): SQL {
    const base = eq(columnsOf(table).householdId, this.householdId);
    return extra ? (and(base, extra) as SQL) : base;
  }

  /** `SELECT * FROM table WHERE household_id = ? [AND extra]`, ordered by nothing. */
  async select<T extends TenantTable>(
    table: T,
    extra?: SQL,
  ): Promise<T["$inferSelect"][]> {
    const rows = await this.db
      .select()
      .from(table as PgTable)
      .where(this.scope(table, extra));
    return rows as T["$inferSelect"][];
  }

  /** One row by id, scoped. `undefined` when the row isn't in this household. */
  async findById<T extends TenantTable>(
    table: T,
    id: string,
  ): Promise<T["$inferSelect"] | undefined> {
    const rows = await this.db
      .select()
      .from(table as PgTable)
      .where(this.scope(table, eq(columnsOf(table).id, id)))
      .limit(1);
    return rows[0] as T["$inferSelect"] | undefined;
  }

  /** Like `findById`, but throws when the row isn't owned by this household. */
  async requireById<T extends TenantTable>(
    table: T,
    id: string,
    label = "Record",
  ): Promise<T["$inferSelect"]> {
    const row = await this.findById(table, id);
    if (!row) throw new Error(`${label} not found`);
    return row;
  }

  /** INSERT with `household_id` forced in. Returns a builder (chain `.returning()`). */
  insert<T extends TenantTable>(
    table: T,
    values:
      | Omit<T["$inferInsert"], "householdId">
      | Omit<T["$inferInsert"], "householdId">[],
  ) {
    const stamp = <V extends object>(v: V) => ({
      ...v,
      householdId: this.householdId,
    });
    const withHousehold = Array.isArray(values)
      ? values.map(stamp)
      : stamp(values);
    return this.db.insert(table).values(withHousehold as T["$inferInsert"]);
  }

  /**
   * `UPDATE ... WHERE id = ? AND household_id = ? RETURNING *` in one round
   * trip. Throws when nothing matched (wrong household or missing row), so the
   * old select-then-update ownership check collapses into this.
   */
  async updateById<T extends TenantTable>(
    table: T,
    id: string,
    patch: Partial<T["$inferInsert"]>,
    label = "Record",
  ): Promise<T["$inferSelect"]> {
    const rows = await this.db
      .update(table)
      .set(patch as Record<string, unknown>)
      .where(this.scope(table, eq(columnsOf(table).id, id)))
      .returning();
    const row = (rows as unknown[])[0];
    if (!row) throw new Error(`${label} not found`);
    return row as T["$inferSelect"];
  }

  /** `DELETE ... WHERE id = ? AND household_id = ? RETURNING *`. Throws if nothing matched. */
  async deleteById<T extends TenantTable>(
    table: T,
    id: string,
    label = "Record",
  ): Promise<T["$inferSelect"]> {
    const rows = await this.db
      .delete(table)
      .where(this.scope(table, eq(columnsOf(table).id, id)))
      .returning();
    const row = (rows as unknown[])[0];
    if (!row) throw new Error(`${label} not found`);
    return row as T["$inferSelect"];
  }
}

export function scopedDb(db: Db, householdId: string): ScopedDb {
  return new ScopedDb(db, householdId);
}
