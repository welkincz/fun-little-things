import { formatDollars } from "../../format";
import { roundCents } from "./money";
import {
  frequencyMeta,
  mortgagePayment,
  periodsUntilPayoff,
  type Compounding,
  type FrequencyId,
} from "./payment";
import { yearlySchedule } from "./schedule";

export type AccelerationSavings = {
  /** Whole years sooner than the monthly schedule. */
  years: number;
  /** Months beyond those years, 0–11. */
  months: number;
  /** Total interest saved versus monthly, in dollars. */
  interestSaved: number;
};

function scheduleCost(
  loan: number,
  annualRate: number,
  amortYears: number,
  frequency: FrequencyId,
  compounding: Compounding,
): { payoffYears: number; interest: number } {
  const quote = mortgagePayment(loan, annualRate, amortYears, frequency, compounding);
  const periods = periodsUntilPayoff(loan, quote.periodicRate, quote.raw, quote.contractPeriods);
  const interest = roundCents(
    yearlySchedule(loan, quote, periods).reduce((sum, row) => sum + row.interest, 0),
  );
  return { payoffYears: periods / quote.perYear, interest };
}

export type ComparisonPoint = {
  year: number;
  /** Remaining balance on the selected schedule. */
  balance: number;
  /** Remaining balance on the same loan, paid monthly. */
  monthly: number;
};

/** Year 0 is the starting balance. Later years are the engine's year-end balances. */
function yearEndBalances(
  loan: number,
  annualRate: number,
  amortYears: number,
  frequency: FrequencyId,
  compounding: Compounding,
): { year: number; balance: number }[] {
  const quote = mortgagePayment(loan, annualRate, amortYears, frequency, compounding);
  const periods = periodsUntilPayoff(loan, quote.periodicRate, quote.raw, quote.contractPeriods);
  const years = yearlySchedule(loan, quote, periods);
  return [{ year: 0, balance: loan }, ...years.map((row) => ({ year: row.year, balance: row.balance }))];
}

/**
 * How much an accelerated frequency beats the monthly schedule on the same
 * loan, rate, and amortization. Other frequencies return null.
 */
export function accelerationVersusMonthly(args: {
  loan: number;
  annualRate: number;
  amortYears: number;
  frequency: FrequencyId;
  compounding: Compounding;
}): AccelerationSavings | null {
  if (!frequencyMeta(args.frequency).accelDivisor) return null;
  if (!(args.loan > 0) || !(args.amortYears > 0)) return null;

  const monthly = scheduleCost(args.loan, args.annualRate, args.amortYears, "monthly", args.compounding);
  const accelerated = scheduleCost(
    args.loan,
    args.annualRate,
    args.amortYears,
    args.frequency,
    args.compounding,
  );
  const deltaMonths = Math.max(0, Math.round((monthly.payoffYears - accelerated.payoffYears) * 12));
  return {
    years: Math.floor(deltaMonths / 12),
    months: deltaMonths % 12,
    interestSaved: roundCents(monthly.interest - accelerated.interest),
  };
}

/**
 * Year-by-year balances for an accelerated schedule beside the same loan
 * paid monthly. After a schedule reaches zero, its balance stays zero.
 * Other frequencies return null.
 */
export function monthlyComparisonSeries(args: {
  loan: number;
  annualRate: number;
  amortYears: number;
  frequency: FrequencyId;
  compounding: Compounding;
}): ComparisonPoint[] | null {
  if (!frequencyMeta(args.frequency).accelDivisor) return null;
  if (!(args.loan > 0) || !(args.amortYears > 0)) return null;

  const accelerated = yearEndBalances(
    args.loan,
    args.annualRate,
    args.amortYears,
    args.frequency,
    args.compounding,
  );
  const monthly = yearEndBalances(args.loan, args.annualRate, args.amortYears, "monthly", args.compounding);
  const lastYear = Math.max(accelerated.length, monthly.length) - 1;
  const points: ComparisonPoint[] = [];
  for (let year = 0; year <= lastYear; year += 1) {
    points.push({
      year,
      balance: accelerated[year]?.balance ?? 0,
      monthly: monthly[year]?.balance ?? 0,
    });
  }
  return points;
}

export function formatAccelerationSavings(savings: AccelerationSavings): string {
  const time =
    [savings.years > 0 ? `${savings.years} yr` : "", savings.months > 0 ? `${savings.months} mo` : ""]
      .filter(Boolean)
      .join(" ") || "0 mo";
  return `Paid off ${time} sooner · saves ${formatDollars(savings.interestSaved)} interest vs monthly`;
}
