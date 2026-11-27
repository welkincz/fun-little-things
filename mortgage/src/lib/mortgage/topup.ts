import { formatCAD, formatDollars } from "../../format";
import { roundCents } from "./money";
import { periodsUntilPayoff, type PaymentQuote } from "./payment";
import { yearlySchedule } from "./schedule";

export type PaymentTopUp = {
  /** Regular payment with the extra dollars added, in dollars. */
  payment: number;
  /** Whole years sooner than the same loan with no top-up. */
  years: number;
  /** Months beyond those years, 0–11. */
  months: number;
  /** Interest saved versus no top-up, in dollars. */
  interestSaved: number;
};

function cost(loan: number, quote: PaymentQuote): { payoffYears: number; interest: number } {
  const periods = periodsUntilPayoff(loan, quote.periodicRate, quote.raw, quote.contractPeriods);
  const interest = roundCents(
    yearlySchedule(loan, quote, periods).reduce((sum, row) => sum + row.interest, 0),
  );
  return { payoffYears: periods / quote.perYear, interest };
}

/**
 * The extra is added to the rounded payment the borrower actually makes.
 * That cent amount, not the unrounded annuity, is what the balance pays down.
 */
function withExtra(quote: PaymentQuote, extra: number): PaymentQuote {
  const payment = roundCents(quote.rounded + extra);
  if (payment === quote.rounded) return quote;
  return { ...quote, raw: payment, rounded: payment };
}

/**
 * How raising every regular payment by `extra` changes payoff time and
 * interest on the same loan and quote. A zero top-up is the baseline.
 * The caller hides that case. A top-up larger than the balance pays the
 * loan off on the next payment, inside the first year.
 */
export function paymentTopUp(args: {
  loan: number;
  quote: PaymentQuote;
  extra: number;
}): PaymentTopUp | null {
  if (!(args.loan > 0)) return null;
  if (!Number.isFinite(args.extra) || args.extra < 0) return null;
  const { quote } = args;
  if (!(quote.perYear > 0) || !(quote.contractPeriods > 0)) return null;
  if (!Number.isFinite(quote.periodicRate) || quote.periodicRate < 0) return null;
  if (!Number.isFinite(quote.raw) || !Number.isFinite(quote.rounded) || quote.rounded < 0) return null;

  const plain = cost(args.loan, quote);
  const raised = withExtra(quote, args.extra);
  const prepaid = raised === quote ? plain : cost(args.loan, raised);
  const deltaMonths = Math.max(0, Math.round((plain.payoffYears - prepaid.payoffYears) * 12));
  return {
    payment: raised.rounded,
    years: Math.floor(deltaMonths / 12),
    months: deltaMonths % 12,
    interestSaved: roundCents(plain.interest - prepaid.interest),
  };
}

export function formatPaymentTopUp(result: PaymentTopUp): string {
  const time =
    [result.years > 0 ? `${result.years} yr` : "", result.months > 0 ? `${result.months} mo` : ""]
      .filter(Boolean)
      .join(" ") || "0 mo";
  return `Each payment becomes ${formatCAD(result.payment)}. Paid off ${time} sooner and saves ${formatDollars(result.interestSaved)} in interest.`;
}
