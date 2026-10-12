import { roundCents, truncCents } from "./money";

export type FrequencyId =
  | "monthly"
  | "semimonthly"
  | "biweekly"
  | "accel-biweekly"
  | "weekly"
  | "accel-weekly";

export type Compounding = "semi" | "monthly";

export const FREQUENCIES: {
  id: FrequencyId;
  label: string;
  perYear: number;
  /** Divisor applied to the rounded monthly payment. 0 means a normal annuity. */
  accelDivisor: 0 | 2 | 4;
  code: string;
}[] = [
  { id: "monthly", label: "Monthly", perYear: 12, accelDivisor: 0, code: "mo" },
  { id: "semimonthly", label: "Semi-monthly", perYear: 24, accelDivisor: 0, code: "sm" },
  { id: "biweekly", label: "Bi-weekly", perYear: 26, accelDivisor: 0, code: "bw" },
  {
    id: "accel-biweekly",
    label: "Accelerated bi-weekly",
    perYear: 26,
    accelDivisor: 2,
    code: "abw",
  },
  { id: "weekly", label: "Weekly", perYear: 52, accelDivisor: 0, code: "wk" },
  {
    id: "accel-weekly",
    label: "Accelerated weekly",
    perYear: 52,
    accelDivisor: 4,
    code: "awk",
  },
];

const byId = Object.fromEntries(FREQUENCIES.map((f) => [f.id, f])) as Record<
  FrequencyId,
  (typeof FREQUENCIES)[number]
>;

export function frequencyByCode(code: string): FrequencyId | null {
  return FREQUENCIES.find((f) => f.code === code)?.id ?? null;
}

export function frequencyMeta(id: FrequencyId) {
  return byId[id];
}

/** R2 fixed, or R3 variable. */
export function periodicRate(
  annualRate: number,
  paymentsPerYear: number,
  compounding: Compounding,
): number {
  if (paymentsPerYear <= 0) return 0;
  if (compounding === "monthly") {
    return (1 + annualRate / 12) ** (12 / paymentsPerYear) - 1;
  }
  return (1 + annualRate / 2) ** (2 / paymentsPerYear) - 1;
}

export type PaymentQuote = {
  raw: number;
  rounded: number;
  periodicRate: number;
  perYear: number;
  /** Contract periods over the full amortization, before early payoff. */
  contractPeriods: number;
};

function annuity(principal: number, i: number, periods: number): number {
  if (periods <= 0) return 0;
  if (i === 0) return principal / periods;
  return (principal * i) / (1 - (1 + i) ** -periods);
}

export function mortgagePayment(
  principal: number,
  annualRate: number,
  amortYears: number,
  frequency: FrequencyId,
  compounding: Compounding,
): PaymentQuote {
  const meta = byId[frequency];
  const contractPeriods = amortYears * meta.perYear;
  const i = periodicRate(annualRate, meta.perYear, compounding);

  if (meta.accelDivisor) {
    const monthly = mortgagePayment(
      principal,
      annualRate,
      amortYears,
      "monthly",
      compounding,
    );
    const rounded = roundCents(monthly.rounded / meta.accelDivisor);
    return {
      raw: monthly.raw / meta.accelDivisor,
      rounded,
      periodicRate: i,
      perYear: meta.perYear,
      contractPeriods,
    };
  }

  const raw = annuity(principal, i, contractPeriods);
  return {
    raw,
    rounded: roundCents(raw),
    periodicRate: i,
    perYear: meta.perYear,
    contractPeriods,
  };
}

/** Closed form. Uses the unrounded annuity payment so published balances match. */
export function rawBalance(
  principal: number,
  i: number,
  rawPayment: number,
  periods: number,
): number {
  if (periods <= 0) return principal;
  if (rawPayment <= 0) return principal;
  if (i === 0) return principal - rawPayment * periods;
  const growth = (1 + i) ** periods;
  return principal * growth - (rawPayment * (growth - 1)) / i;
}

export function balanceAfterPayments(
  principal: number,
  i: number,
  rawPayment: number,
  periods: number,
): number {
  return truncCents(rawBalance(principal, i, rawPayment, periods));
}

/** First period whose closed-form balance is at or under half a cent. */
export function periodsUntilPayoff(
  principal: number,
  i: number,
  rawPayment: number,
  maxPeriods: number,
): number {
  if (!(principal > 0) || !(rawPayment > 0)) return maxPeriods + 1;
  if (i > 0 && rawPayment <= principal * i + 1e-6) return maxPeriods + 1;
  const due = (k: number) => rawBalance(principal, i, rawPayment, k);
  if (due(1) <= 0.005) return 1;
  if (due(maxPeriods) > 0.005) return maxPeriods + 1;
  let lo = 1;
  let hi = Math.max(1, Math.ceil(maxPeriods));
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (due(mid) > 0.005) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function monthlyEquivalent(payment: number, frequency: FrequencyId): number {
  const perYear = byId[frequency].perYear;
  if (frequency === "monthly") return payment;
  return (payment * perYear) / 12;
}
