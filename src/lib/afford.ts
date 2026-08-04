import { dollarsToCents, formatCents } from "@/lib/money";

export type AffordCashAnswer = {
  availableCents: number;
  purchaseCents: number;
  canCoverFromAvailable: boolean;
  leftoverAvailableCents: number;
};

export type AffordGoalImpact = {
  goalId: string;
  goalName: string;
  currentCents: number;
  targetCents: number;
  targetDate: string | null;
  beforeEstimatedCompletion: string | null;
  afterEstimatedCompletion: string | null;
  monthsDelay: number | null;
  note: string;
};

/**
 * Simple what-if (plan A): cash from Available, and goal impact assuming
 * $X less could have been assigned / reduces monthly surplus for goals.
 * Does not write any data.
 */
export function affordCashAnswer(
  availableCents: number,
  purchaseCents: number,
): AffordCashAnswer {
  return {
    availableCents,
    purchaseCents,
    canCoverFromAvailable: availableCents >= purchaseCents,
    leftoverAvailableCents: availableCents - purchaseCents,
  };
}

export function affordGoalImpacts(
  purchaseCents: number,
  goals: Array<{
    id: string;
    name: string;
    targetCents: number;
    targetDate: string | null;
    currentCents: number;
    estimatedCompletion: string | null;
    suggestedMonthlyCents: number | null;
  }>,
): AffordGoalImpact[] {
  if (purchaseCents <= 0) return [];

  return goals.map((goal) => {
    const remaining = Math.max(goal.targetCents - goal.currentCents, 0);
    if (remaining === 0) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        currentCents: goal.currentCents,
        targetCents: goal.targetCents,
        targetDate: goal.targetDate,
        beforeEstimatedCompletion: goal.estimatedCompletion,
        afterEstimatedCompletion: "Reached",
        monthsDelay: 0,
        note: "Already funded — no impact.",
      };
    }

    const monthly =
      goal.suggestedMonthlyCents && goal.suggestedMonthlyCents > 0
        ? goal.suggestedMonthlyCents
        : null;

    // If this purchase consumes dollars that could have gone to the goal,
    // estimate delay as purchase / monthly contribution pace.
    let monthsDelay: number | null = null;
    let afterEstimatedCompletion: string | null = goal.estimatedCompletion;

    if (monthly) {
      monthsDelay = Math.ceil(purchaseCents / monthly);
      if (goal.estimatedCompletion && goal.estimatedCompletion !== "Reached") {
        const [y, m] = goal.estimatedCompletion.split("-").map(Number);
        const est = new Date(y, m - 1 + monthsDelay, 12);
        afterEstimatedCompletion = `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}`;
      } else if (goal.targetDate) {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const monthsNeeded = Math.ceil(remaining / monthly) + monthsDelay;
        const est = new Date(today);
        est.setMonth(est.getMonth() + monthsNeeded);
        afterEstimatedCompletion = `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}`;
      }
    }

    return {
      goalId: goal.id,
      goalName: goal.name,
      currentCents: goal.currentCents,
      targetCents: goal.targetCents,
      targetDate: goal.targetDate,
      beforeEstimatedCompletion: goal.estimatedCompletion,
      afterEstimatedCompletion,
      monthsDelay,
      note: monthly
        ? `If ${formatCents(purchaseCents)} came from goal funding at ~${formatCents(monthly)}/mo, expect ~${monthsDelay} month delay.`
        : "Set a target date on this goal for a clearer delay estimate.",
    };
  });
}

export function parsePurchaseCents(raw: string): number {
  return dollarsToCents(raw);
}
