import {
  boolean,
  date,
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
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accounts = pgTable("accounts", {
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
});

/** Plan bucket = spend category (Necessary or Unnecessary). */
export const buckets = pgTable("buckets", {
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
});

/** Longer-term targets — funded by Available → Goal assigns or transfers in. */
export const goals = pgTable("goals", {
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
});

/**
 * Dated obligations (rent, insurance, Christmas).
 * Covered when linked bucket remaining >= amount.
 */
export const plannedExpenses = pgTable("planned_expenses", {
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
});

/**
 * Assignment of Available dollars to a bucket or a goal.
 * monthKey = "YYYY-MM" for the plan month this assign belongs to.
 */
export const assignments = pgTable("assignments", {
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
});

/**
 * type: income | expense | transfer | adjustment
 * expense requires bucketId; transfer uses transferGroupId to pair legs;
 * adjustment is a manual balance correction on one account (not spend).
 */
export const transactions = pgTable("transactions", {
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
});

/** Freeform household notes (goals, reminders, etc.). */
export const notes = pgTable("notes", {
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
});
