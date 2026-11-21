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

type LumpTrace = {
  payoffYears: number;
  interest: number;
  /** Regular payment made at each period, in order. Empty when the loan never pays off. */
  payments: number[];
  /** Lump applied at the end of that 1-based period, capped by the balance. */
  lumps: { period: number; amount: number }[];
};

/**
 * Payoff when `lumpSum` is applied once each anniversary, after that year's
 * payments, and never for more than the balance left.
 */
function traceLump(loan: number, quote: PaymentQuote, lumpSum: number): LumpTrace {
  let balance = loan;
  let periods = 0;
  let interest = 0;
  const payments: number[] = [];
  const lumps: { period: number; amount: number }[] = [];
  const limit = quote.contractPeriods;

  while (balance > 0.005 && periods < limit) {
    const left = Math.min(quote.perYear, limit - periods);
    const within = periodsUntilPayoff(balance, quote.periodicRate, quote.raw, left);
    if (within <= left) {
      const done = slice(balance, quote, within, true);
      if (within > 0) {
        const before = Math.max(0, rawBalance(balance, quote.periodicRate, quote.raw, within - 1));
        const last = roundCents(before * (1 + quote.periodicRate));
        for (let k = 1; k < within; k += 1) payments.push(quote.rounded);
        payments.push(last);
      }
      interest = roundCents(interest + done.interest);
      periods += within;
      balance = 0;
      break;
    }
    const year = slice(balance, quote, left, false);
    interest = roundCents(interest + year.interest);
    for (let k = 0; k < left; k += 1) payments.push(quote.rounded);
    periods += left;
    const applied = Math.min(lumpSum, year.balance);
    if (applied > 0.004) lumps.push({ period: periods, amount: roundCents(applied) });
    balance = roundCents(year.balance - applied);
    if (!(balance > 0.005)) {
      balance = 0;
      break;
    }
  }

  const paidOff = !(balance > 0.005);
  if (!paidOff) periods = limit + 1;
  return {
    payoffYears: periods / quote.perYear,
    interest: roundCents(interest),
    payments: paidOff ? payments : [],
    lumps: paidOff ? lumps : [],
  };
}

function payoffWithLump(
  loan: number,
  quote: PaymentQuote,
  lumpSum: number,
): { payoffYears: number; interest: number } {
  const traced = traceLump(loan, quote, lumpSum);
  return { payoffYears: traced.payoffYears, interest: traced.interest };
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

export type InvestAccount = "tfsa" | "taxable";

export type PrepayOrInvest = {
  /** Original payoff, in years, with no lump sum. */
  horizonYears: number;
  /** Interest saved by prepaying, in dollars. Already inside the freed payments. */
  interestSaved: number;
  /** Future value of regular payments invested after the earlier payoff. */
  prepay: number;
  /** Future value of the lump sums that would have been prepaid. */
  invest: number;
  ahead: "prepay" | "invest" | "tie";
  difference: number;
  /** Annual return, as a decimal, where the two future values match. */
  breakEvenReturn: number | null;
};

/** Closed-form payments with no lump, including a smaller final payment. */
function scheduledPayments(loan: number, quote: PaymentQuote): number[] | null {
  const periods = periodsUntilPayoff(loan, quote.periodicRate, quote.raw, quote.contractPeriods);
  if (periods < 1 || periods > quote.contractPeriods) return null;
  const payments: number[] = [];
  for (let period = 1; period < periods; period += 1) payments.push(quote.rounded);
  const before = Math.max(0, rawBalance(loan, quote.periodicRate, quote.raw, periods - 1));
  payments.push(roundCents(before * (1 + quote.periodicRate)));
  return payments;
}

/**
 * Future value of end-of-period contributions. `annual` is the effective
 * yearly rate after tax. A TFSA uses the entered return. A non-registered
 * account uses return × (1 − marginal tax), taxed once a year.
 */
function futureValue(contributions: number[], perYear: number, annual: number): number {
  const factor = annual > 0 ? (1 + annual) ** (1 / perYear) : 1;
  let balance = 0;
  for (let i = 0; i < contributions.length; i += 1) {
    balance *= factor;
    const add = contributions[i];
    if (add) balance += add;
  }
  return roundCents(balance);
}

function afterTaxReturn(annualReturn: number, marginalTax: number, account: InvestAccount): number {
  if (!(annualReturn > 0)) return 0;
  if (account === "tfsa") return annualReturn;
  return annualReturn * (1 - marginalTax);
}

function breakEvenReturn(
  freed: number[],
  lumps: number[],
  perYear: number,
  marginalTax: number,
  account: InvestAccount,
): number | null {
  const gap = (rate: number) => {
    const net = afterTaxReturn(rate, marginalTax, account);
    return futureValue(lumps, perYear, net) - futureValue(freed, perYear, net);
  };
  if (gap(0) > 0) return null;
  if (gap(0) === 0) return 0;
  let lo = 0;
  let hi = 0.05;
  while (gap(hi) < 0 && hi < 3) hi = Math.min(3, hi * 2);
  if (gap(hi) < 0) return null;
  for (let step = 0; step < 50; step += 1) {
    const mid = (lo + hi) / 2;
    if (gap(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Prepay the yearly lump sum, or invest those same amounts.
 * Compared at the original payoff, with no prepayment.
 * Prepay's total is the future value of the regular payments freed after the
 * earlier payoff. Interest saved is not added again: those dollars are the
 * freed payments. Invest's total is the future value of the lump sums actually
 * applied, capped by the balance, at the same dates.
 */
export function prepayOrInvest(args: {
  loan: number;
  annualRate: number;
  amortYears: number;
  frequency: FrequencyId;
  compounding: Compounding;
  lumpSum: number;
  /** Effective annual return, before tax. 0.06 is 6%. */
  annualReturn: number;
  /** Marginal rate on growth. Ignored for a TFSA. 0.4 is 40%. */
  marginalTax: number;
  account: InvestAccount;
}): PrepayOrInvest | null {
  if (!(args.lumpSum > 0)) return null;
  if (!Number.isFinite(args.annualReturn) || args.annualReturn < 0) return null;
  if (args.account === "taxable") {
    if (!Number.isFinite(args.marginalTax) || args.marginalTax < 0 || args.marginalTax > 1) return null;
  } else if (args.account !== "tfsa") return null;

  const savings = yearlyLumpSum({
    loan: args.loan,
    annualRate: args.annualRate,
    amortYears: args.amortYears,
    frequency: args.frequency,
    compounding: args.compounding,
    lumpSum: args.lumpSum,
  });
  if (!savings) return null;

  const quote = mortgagePayment(
    args.loan,
    args.annualRate,
    args.amortYears,
    args.frequency,
    args.compounding,
  );
  const plain = scheduledPayments(args.loan, quote);
  const prepaid = traceLump(args.loan, quote, args.lumpSum);
  if (!plain || prepaid.payments.length === 0 || prepaid.payments.length > plain.length) return null;

  const horizon = plain.length;
  const freed = new Array<number>(horizon).fill(0);
  const lumps = new Array<number>(horizon).fill(0);
  for (let i = 0; i < horizon; i += 1) {
    const extra = plain[i] - (prepaid.payments[i] ?? 0);
    if (extra > 0.004) freed[i] = extra;
  }
  for (const lump of prepaid.lumps) {
    const index = lump.period - 1;
    if (index >= 0 && index < horizon) lumps[index] += lump.amount;
  }

  const tax = args.account === "tfsa" ? 0 : args.marginalTax;
  const net = afterTaxReturn(args.annualReturn, tax, args.account);
  const prepay = futureValue(freed, quote.perYear, net);
  const invest = futureValue(lumps, quote.perYear, net);
  const difference = roundCents(Math.abs(prepay - invest));
  const ahead = difference === 0 ? "tie" : prepay > invest ? "prepay" : "invest";

  return {
    horizonYears: plain.length / quote.perYear,
    interestSaved: savings.interestSaved,
    prepay,
    invest,
    ahead,
    difference,
    breakEvenReturn: breakEvenReturn(freed, lumps, quote.perYear, tax, args.account),
  };
}

export function formatPrepayOrInvest(result: PrepayOrInvest): string {
  if (result.ahead === "tie" || formatDollars(result.difference) === formatDollars(0)) {
    return "They come out the same.";
  }
  const gap = formatDollars(result.difference);
  if (result.ahead === "prepay") return `Prepaying comes out ahead by ${gap}.`;
  return `Investing comes out ahead by ${gap}.`;
}
