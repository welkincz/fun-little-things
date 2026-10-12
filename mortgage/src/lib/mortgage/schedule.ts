import { roundCents, truncCents } from "./money";
import { balanceAfterPayments, rawBalance, type PaymentQuote } from "./payment";

export type YearRow = {
  year: number;
  payments: number;
  paid: number;
  principal: number;
  interest: number;
  balance: number;
};

export function yearlySchedule(
  loan: number,
  quote: PaymentQuote,
  payoffPeriods: number,
): YearRow[] {
  const rows: YearRow[] = [];
  const perYear = quote.perYear;
  const last = Math.min(payoffPeriods, quote.contractPeriods);
  if (!(last > 0)) return rows;
  const years = Math.ceil(last / perYear);

  for (let year = 1; year <= years; year += 1) {
    const startK = (year - 1) * perYear;
    const endK = Math.min(year * perYear, last);
    const startBal =
      startK === 0 ? roundCents(loan) : balanceAfterPayments(loan, quote.periodicRate, quote.raw, startK);
    const endBal =
      endK >= payoffPeriods
        ? 0
        : balanceAfterPayments(loan, quote.periodicRate, quote.raw, endK);
    const count = endK - startK;
    const principal = roundCents(startBal - endBal);
    let paid = roundCents(quote.rounded * count);
    if (endBal === 0 && count > 0) {
      const before = rawBalance(loan, quote.periodicRate, quote.raw, endK - 1);
      const interestLast = Math.max(0, before) * quote.periodicRate;
      const lastPayment = Math.max(0, before) + interestLast;
      paid = roundCents(quote.rounded * (count - 1) + lastPayment);
    }
    const interest = roundCents(paid - principal);
    rows.push({
      year,
      payments: count,
      paid,
      principal,
      interest,
      balance: endBal,
    });
  }
  return rows;
}

export function termTotals(
  loan: number,
  quote: PaymentQuote,
  termYears: number,
  payoffPeriods: number,
): { balance: number; principal: number; interest: number; paid: number; periods: number } {
  const termPeriods = termYears * quote.perYear;
  const periods = Math.min(termPeriods, payoffPeriods);
  const balance = periods >= payoffPeriods ? 0 : truncCents(rawBalance(loan, quote.periodicRate, quote.raw, periods));
  const paid =
    periods >= payoffPeriods
      ? paidThroughPayoff(loan, quote, payoffPeriods)
      : roundCents(quote.rounded * periods);
  const principal = roundCents(loan - balance);
  const interest = roundCents(paid - principal);
  return { balance, principal, interest, paid, periods };
}

function paidThroughPayoff(loan: number, quote: PaymentQuote, payoffPeriods: number): number {
  if (payoffPeriods <= 0) return 0;
  const before = Math.max(0, rawBalance(loan, quote.periodicRate, quote.raw, payoffPeriods - 1));
  const last = before + before * quote.periodicRate;
  return roundCents(quote.rounded * (payoffPeriods - 1) + last);
}
