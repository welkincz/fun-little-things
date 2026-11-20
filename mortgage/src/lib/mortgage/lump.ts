import { formatDollars } from "../../format";
import { roundCents } from "./money";
import {
  balanceAfterPayments,
  mortgagePayment,
  periodsUntilPayoff,
  rawBalance,
  type Compounding,
  type FrequencyId,
  type PaymentQuote,
} from "./payment";
import { yearlySchedule } from "./schedule";

export type YearlyLumpSum = {
  /** Years until the balance is gone. The anniversary lump counts as the end of that year. */
  payoffYears: number;
  /** Total interest paid, in dollars. */
  interest: number;
  /** Whole years sooner than the same loan with no lump sum. */
  years: number;
  /** Months beyond those years, 0–11. */
  months: number;
  /** Interest saved versus no lump sum, in dollars. */
  interestSaved: number;
};

function baseline(loan: number, quote: PaymentQuote): { payoffYears: number; interest: number } {
  const periods = periodsUntilPayoff(loan, quote.periodicRate, quote.raw, quote.contractPeriods);
  const interest = roundCents(
    yearlySchedule(loan, quote, periods).reduce((sum, row) => sum + row.interest, 0),
  );
  return { payoffYears: periods / quote.perYear, interest };
}

/** One stretch of regular payments, using the same rounding as the yearly schedule. */
function slice(
  balance: number,
  quote: PaymentQuote,
  payments: number,
  paysOff: boolean,
): { interest: number; balance: number } {
  const startBal = roundCents(balance);
  const endBal = paysOff
    ? 0
    : balanceAfterPayments(balance, quote.periodicRate, quote.raw, payments);
  const principal = roundCents(startBal - endBal);
  let paid = roundCents(quote.rounded * payments);
  if (paysOff && payments > 0) {
    const before = Math.max(0, rawBalance(balance, quote.periodicRate, quote.raw, payments - 1));
    paid = roundCents(quote.rounded * (payments - 1) + before * (1 + quote.periodicRate));
  }
  return { interest: roundCents(paid - principal), balance: endBal };
}

/**
 * Payoff when `lumpSum` is applied once each anniversary, after that year's
 * payments, and never for more than the balance left.
 */
function payoffWithLump(
  loan: number,
  quote: PaymentQuote,
  lumpSum: number,
): { payoffYears: number; interest: number } {
  let balance = loan;
  let periods = 0;
  let interest = 0;
  const limit = quote.contractPeriods;

  while (balance > 0.005 && periods < limit) {
    const left = Math.min(quote.perYear, limit - periods);
    const within = periodsUntilPayoff(balance, quote.periodicRate, quote.raw, left);
    if (within <= left) {
      const done = slice(balance, quote, within, true);
      interest = roundCents(interest + done.interest);
      periods += within;
      balance = 0;
      break;
    }
    const year = slice(balance, quote, left, false);
    interest = roundCents(interest + year.interest);
    periods += left;
    const applied = Math.min(lumpSum, year.balance);
    balance = roundCents(year.balance - applied);
    if (!(balance > 0.005)) {
      balance = 0;
      break;
    }
  }

  if (balance > 0.005) periods = limit + 1;
  return { payoffYears: periods / quote.perYear, interest: roundCents(interest) };
}

/**
 * How a yearly lump sum changes payoff time and interest on the same loan,
 * rate, amortization, and payment frequency. A zero lump sum is the baseline.
 */
export function yearlyLumpSum(args: {
  loan: number;
  annualRate: number;
  amortYears: number;
  frequency: FrequencyId;
  compounding: Compounding;
  lumpSum: number;
}): YearlyLumpSum | null {
  if (!(args.loan > 0) || !(args.amortYears > 0)) return null;
  if (!Number.isFinite(args.annualRate) || args.annualRate < 0) return null;
  if (!Number.isFinite(args.lumpSum) || args.lumpSum < 0) return null;

  const quote = mortgagePayment(
    args.loan,
    args.annualRate,
    args.amortYears,
    args.frequency,
    args.compounding,
  );
  const plain = baseline(args.loan, quote);
  const prepaid = args.lumpSum > 0 ? payoffWithLump(args.loan, quote, args.lumpSum) : plain;
  const deltaMonths = Math.max(0, Math.round((plain.payoffYears - prepaid.payoffYears) * 12));
  return {
    payoffYears: prepaid.payoffYears,
    interest: prepaid.interest,
    years: Math.floor(deltaMonths / 12),
    months: deltaMonths % 12,
    interestSaved: roundCents(plain.interest - prepaid.interest),
  };
}

export function formatYearlyLumpSum(savings: YearlyLumpSum): string {
  const time =
    [savings.years > 0 ? `${savings.years} yr` : "", savings.months > 0 ? `${savings.months} mo` : ""]
      .filter(Boolean)
      .join(" ") || "0 mo";
  return `Paid off ${time} sooner and saves ${formatDollars(savings.interestSaved)} in interest.`;
}
