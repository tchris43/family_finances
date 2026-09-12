import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Money stored as integer cents. Display as dollars in the UI. */

export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  /** Set once the first-login walkthrough is dismissed or completed. */
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("users_household_idx").on(t.householdId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // checking | savings | credit | investment | loan | other
    institution: text("institution"),
    startingBalanceCents: integer("starting_balance_cents").notNull().default(0),
    isMain: boolean("is_main").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("accounts_household_idx").on(t.householdId)],
);

/** Plan bucket = spend category (Necessary or Unnecessary). */
export const buckets = pgTable(
  "buckets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** necessary | unnecessary */
    fundKind: text("fund_kind").notNull().default("necessary"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("buckets_household_idx").on(t.householdId),
    index("buckets_household_fund_kind_idx").on(t.householdId, t.fundKind),
  ],
);

/** Longer-term targets — funded by Available → Goal assigns or transfers in. */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetCents: integer("target_cents").notNull(),
    targetDate: date("target_date"),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("goals_household_idx").on(t.householdId)],
);

/**
 * Dated obligations (rent, insurance, Christmas).
 * Covered when linked bucket remaining >= amount.
 */
export const plannedExpenses = pgTable(
  "planned_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    bucketId: uuid("bucket_id")
      .notNull()
      .references(() => buckets.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    dueDate: date("due_date").notNull(),
    recurrence: text("recurrence").notNull().default("once"), // once | monthly | yearly
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("planned_expenses_household_idx").on(t.householdId),
    index("planned_expenses_household_bucket_idx").on(
      t.householdId,
      t.bucketId,
    ),
    index("planned_expenses_household_due_date_idx").on(
      t.householdId,
      t.dueDate,
    ),
  ],
);

/**
 * Assignment of Available dollars to a bucket or a goal.
 * monthKey = "YYYY-MM" for the plan month this assign belongs to.
 */
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    bucketId: uuid("bucket_id").references(() => buckets.id, {
      onDelete: "cascade",
    }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    monthKey: text("month_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("assignments_household_idx").on(t.householdId),
    index("assignments_household_bucket_month_idx").on(
      t.householdId,
      t.bucketId,
      t.monthKey,
    ),
    index("assignments_household_goal_month_idx").on(
      t.householdId,
      t.goalId,
      t.monthKey,
    ),
  ],
);

/**
 * type: income | expense | transfer | adjustment
 * expense requires bucketId; transfer uses transferGroupId to pair legs;
 * adjustment is a manual balance correction on one account (not spend).
 */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    bucketId: uuid("bucket_id").references(() => buckets.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    /** Signed cents relative to the account: + in, − out. */
    amountCents: integer("amount_cents").notNull(),
    date: date("date").notNull(),
    merchant: text("merchant"),
    notes: text("notes"),
    transferGroupId: uuid("transfer_group_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("transactions_household_idx").on(t.householdId),
    index("transactions_household_type_idx").on(t.householdId, t.type),
    index("transactions_household_bucket_idx").on(t.householdId, t.bucketId),
    index("transactions_household_account_idx").on(t.householdId, t.accountId),
    index("transactions_household_date_idx").on(t.householdId, t.date),
    index("transactions_transfer_group_idx").on(t.transferGroupId),
  ],
);

/** Freeform household notes (goals, reminders, etc.). */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("notes_household_idx").on(t.householdId)],
);

/**
 * Monthly cashflow forecast lines (not real ledger transactions).
 * kind: paycheck | expense | goal
 */
export const cashflowLines = pgTable(
  "cashflow_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // paycheck | expense | goal
    label: text("label").notNull(),
    amountCents: integer("amount_cents").notNull(),
    bucketId: uuid("bucket_id").references(() => buckets.id, {
      onDelete: "set null",
    }),
    goalId: uuid("goal_id").references(() => goals.id, {
      onDelete: "cascade",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("cashflow_lines_household_idx").on(t.householdId),
    index("cashflow_lines_household_kind_idx").on(t.householdId, t.kind),
  ],
);

/**
 * Goals deliberately left out of the cashflow forecast.
 * Removing a goal line from Cashflow only affects the forecast — not the goal.
 */
export const cashflowGoalExclusions = pgTable(
  "cashflow_goal_exclusions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("cashflow_goal_exclusions_household_idx").on(t.householdId),
    index("cashflow_goal_exclusions_household_goal_idx").on(
      t.householdId,
      t.goalId,
    ),
  ],
);

/**
 * Single-use signup codes. Not a tenant table — an invite exists before the
 * household it creates. Redeeming one is what provisions a new household.
 */
export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  /** Free-text reminder of who this was for. */
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  redeemedHouseholdId: uuid("redeemed_household_id").references(
    () => households.id,
    { onDelete: "set null" },
  ),
});

/** Shared household shopping list. */
export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    checked: boolean("checked").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("shopping_items_household_idx").on(t.householdId)],
);
