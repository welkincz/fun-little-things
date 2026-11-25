import { roundCents } from "./money";

export type PenaltyBinding = "three-months" | "ird";

export type BreakPenalty = {
  /** balance × contract rate × 3/12. */
  threeMonthsInterest: number;
  /** Null on a variable rate. Zero when the comparison rate is not below the contract rate. */
  ird: number | null;
  penalty: number;
  /** The interest-rate differential only when it is strictly greater, after rounding to the cent. */
  binding: PenaltyBinding;
};

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

/**
 * Estimate of the penalty for breaking a Canadian mortgage during the term.
 * Variable mortgages use three months of interest. Fixed mortgages use the
 * greater of that amount and the interest-rate differential.
 */
export function breakPenalty(input: {
  rateType: "fixed" | "variable";
  balance: number;
  /** Annual contract rate as a decimal, such as 0.05 for 5%. */
  contractRate: number;
  monthsLeft: number;
  /** Annual rate for a new term about as long as what is left. Ignored when variable. */
  comparisonRate: number;
}): BreakPenalty {
  const balance = nonNegative(input.balance);
  const contractRate = nonNegative(input.contractRate);
  const monthsLeft = nonNegative(input.monthsLeft);
  const threeMonthsInterest = roundCents((balance * contractRate * 3) / 12);

  if (input.rateType === "variable") {
    return {
      threeMonthsInterest,
      ird: null,
      penalty: threeMonthsInterest,
      binding: "three-months",
    };
  }

  const gap = Math.max(0, contractRate - nonNegative(input.comparisonRate));
  const ird = roundCents((balance * gap * monthsLeft) / 12);
  const irdBinds = ird > threeMonthsInterest;
  return {
    threeMonthsInterest,
    ird,
    penalty: irdBinds ? ird : threeMonthsInterest,
    binding: irdBinds ? "ird" : "three-months",
  };
}
