import { roundCents } from "./money";
import {
  frequencyMeta,
  monthlyEquivalent,
  mortgagePayment,
  periodicRate,
  type Compounding,
  type FrequencyId,
} from "./payment";

export type RenewalQuote = {
  label: string;
  rate: number;
  payment: number;
  monthly: number;
  deltaMonthly: number;
  /** Years of amortization that keep the current payment. Null when interest is not covered. */
  flatYears: number | null;
  /** Extra months, 0–11. Null together with flatYears. */
  flatMonths: number | null;
};

export type KeepPaymentAmortization = {
  years: number;
  months: number;
};

/**
 * Shortest amortization whose rounded payment is at most `payment`.
 * The length is a whole number of payment periods, shown as years and months
 * rounded up so the span still covers those periods.
 * Null when `payment` does not cover the interest.
 */
export function keepPaymentAmortization(
  balance: number,
  annualRate: number,
  payment: number,
  frequency: FrequencyId,
  compounding: Compounding,
): KeepPaymentAmortization | null {
  if (!(balance > 0) || !(payment > 0) || !Number.isFinite(annualRate) || annualRate < 0) return null;
  const perYear = frequencyMeta(frequency).perYear;
  const i = periodicRate(annualRate, perYear, compounding);
  if (i > 0 && !(payment > balance * i)) return null;

  const rounded = (periods: number) =>
    mortgagePayment(balance, annualRate, periods / perYear, frequency, compounding).rounded;

  const maxPeriods = perYear * 600;
  if (rounded(maxPeriods) > payment) return null;

  let lo = 0;
  let hi = 1;
  while (rounded(hi) > payment) {
    lo = hi;
    if (hi >= maxPeriods) return null;
    hi = Math.min(maxPeriods, hi * 2);
  }
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (rounded(mid) > payment) lo = mid;
    else hi = mid;
  }
  return periodsToYearsMonths(hi, perYear);
}

/** Whole months that cover `periods` payments. Monthly periods land on exact months. */
function periodsToYearsMonths(periods: number, perYear: number): KeepPaymentAmortization {
  const totalMonths = Math.ceil((periods * 12) / perYear - 1e-9);
  const years = Math.floor(totalMonths / 12);
  return { years, months: totalMonths - years * 12 };
}

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
  currentPayment: number;
  currentMonthly: number;
  customPercent: number | null;
}): RenewalQuote[] {
  const steps = [0, 1, 2];
  const rows: RenewalQuote[] = steps.map((step) =>
    quoteRow(step === 0 ? "Same rate" : `+${step}%`, args.contractRate + step / 100, args),
  );

  if (args.customPercent != null && args.customPercent >= 0) {
    const rate = args.customPercent / 100;
    const duplicate = rows.some((row) => Math.abs(row.rate - rate) < 1e-8);
    if (!duplicate) rows.push(quoteRow("Custom", rate, args));
  }
  return rows;
}

function quoteRow(
  label: string,
  rate: number,
  args: {
    balance: number;
    yearsLeft: number;
    frequency: FrequencyId;
    compounding: Compounding;
    currentPayment: number;
    currentMonthly: number;
  },
): RenewalQuote {
  const quote = renewalPayment(args.balance, rate, args.yearsLeft, args.frequency, args.compounding);
  const monthly = monthlyEquivalent(quote.rounded, args.frequency);
  const flat = keepPaymentAmortization(
    args.balance,
    rate,
    args.currentPayment,
    args.frequency,
    args.compounding,
  );
  return {
    label,
    rate,
    payment: quote.rounded,
    monthly: roundCents(monthly),
    deltaMonthly: roundCents(monthly - args.currentMonthly),
    flatYears: flat?.years ?? null,
    flatMonths: flat?.months ?? null,
  };
}
