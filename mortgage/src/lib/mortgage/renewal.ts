import {
  monthlyEquivalent,
  mortgagePayment,
  type Compounding,
  type FrequencyId,
} from "./payment";
import { roundCents } from "./money";

export type RenewalQuote = {
  label: string;
  rate: number;
  payment: number;
  monthly: number;
  deltaMonthly: number;
};

export function renewalPayment(
  balance: number,
  annualRate: number,
  yearsLeft: number,
  frequency: FrequencyId,
  compounding: Compounding,
) {
  return mortgagePayment(balance, annualRate, yearsLeft, frequency, compounding);
}

export function renewalRows(args: {
  balance: number;
  contractRate: number;
  yearsLeft: number;
  frequency: FrequencyId;
  compounding: Compounding;
  currentMonthly: number;
  customPercent: number | null;
}): RenewalQuote[] {
  const steps = [0, 1, 2];
  const rows: RenewalQuote[] = steps.map((step) => {
    const rate = args.contractRate + step / 100;
    const quote = renewalPayment(
      args.balance,
      rate,
      args.yearsLeft,
      args.frequency,
      args.compounding,
    );
    const monthly = monthlyEquivalent(quote.rounded, args.frequency);
    return {
      label: step === 0 ? "Same rate" : `+${step}%`,
      rate,
      payment: quote.rounded,
      monthly: roundCents(monthly),
      deltaMonthly: roundCents(monthly - args.currentMonthly),
    };
  });

  if (args.customPercent != null && args.customPercent >= 0) {
    const rate = args.customPercent / 100;
    const duplicate = rows.some((row) => Math.abs(row.rate - rate) < 1e-8);
    if (!duplicate) {
      const quote = renewalPayment(
        args.balance,
        rate,
        args.yearsLeft,
        args.frequency,
        args.compounding,
      );
      const monthly = monthlyEquivalent(quote.rounded, args.frequency);
      rows.push({
        label: "Custom",
        rate,
        payment: quote.rounded,
        monthly: roundCents(monthly),
        deltaMonthly: roundCents(monthly - args.currentMonthly),
      });
    }
  }
  return rows;
}
