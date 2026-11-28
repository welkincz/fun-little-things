import { formatPercentPoints } from "../../format";
import { frequencyMeta, type FrequencyId } from "./payment";

export type TriggerRate = {
  /** Nominal annual rate, the same unit mortgagePayment takes (0.0664 is 6.64%). */
  annualRate: number;
  /** annualRate minus the current contract rate, in the same units. */
  pointsAbove: number;
};

/**
 * Annual rate at which one period of interest equals the regular payment.
 *
 * Canadian variable-rate convention already used by periodicRate: monthly
 * compounding, i = (1 + r/12)^(12/n) − 1. Fixed mortgages here use semi-annual
 * compounding, i = (1 + r/2)^(2/n) − 1. A fixed-payment variable product does
 * not, so this inverts the monthly formula even when the payment on screen
 * was quoted with semi-annual compounding.
 */
export function triggerRate(input: {
  balance: number;
  payment: number;
  frequency: FrequencyId;
  currentRate: number;
}): TriggerRate | null {
  const { balance, payment, frequency, currentRate } = input;
  if (!(balance > 0) || !(payment > 0) || !Number.isFinite(currentRate) || currentRate < 0) return null;
  const perYear = frequencyMeta(frequency).perYear;
  if (!(perYear > 0)) return null;
  const annualRate = 12 * ((1 + payment / balance) ** (perYear / 12) - 1);
  if (!Number.isFinite(annualRate) || annualRate < 0) return null;
  return { annualRate, pointsAbove: annualRate - currentRate };
}

export function triggerRateSentence(annualRate: number): string {
  return `If your variable rate rises above ${formatPercentPoints(annualRate)}, your payment no longer covers the interest and your balance stops going down.`;
}
