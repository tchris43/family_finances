import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import {
  accounts,
  assignments,
  buckets,
  cashflowLines,
  goals,
  households,
  notes,
  plannedExpenses,
  transactions,
  users,
} from "@/db/schema";

export const BACKUP_VERSION = 1;

export async function buildHouseholdBackup(db: Db, householdId: string) {
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (!household) throw new Error("Household not found");

  const [
    householdUsers,
    householdAccounts,
    householdBuckets,
    householdGoals,
    householdAssignments,
    householdTransactions,
    householdPlannedExpenses,
    householdNotes,
    householdCashflow,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.householdId, householdId)),
    db.select().from(accounts).where(eq(accounts.householdId, householdId)),
    db.select().from(buckets).where(eq(buckets.householdId, householdId)),
    db.select().from(goals).where(eq(goals.householdId, householdId)),
    db
      .select()
      .from(assignments)
      .where(eq(assignments.householdId, householdId)),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.householdId, householdId)),
    db
      .select()
      .from(plannedExpenses)
      .where(eq(plannedExpenses.householdId, householdId)),
    db.select().from(notes).where(eq(notes.householdId, householdId)),
    db
      .select()
      .from(cashflowLines)
      .where(eq(cashflowLines.householdId, householdId)),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    household: {
      id: household.id,
      name: household.name,
      createdAt: household.createdAt,
    },
    users: householdUsers.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      // passwordHash intentionally omitted
    })),
    accounts: householdAccounts,
    buckets: householdBuckets,
    goals: householdGoals,
    assignments: householdAssignments,
    transactions: householdTransactions,
    plannedExpenses: householdPlannedExpenses,
    notes: householdNotes,
    cashflowLines: householdCashflow,
  };
}
