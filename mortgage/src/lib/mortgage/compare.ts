import { roundCents } from "./money";
import {
  mortgagePayment,
  periodsUntilPayoff,
  type Compounding,
  type FrequencyId,
} from "./payment";
import { termTotals } from "./schedule";

export type RateQuote = {
  payment: number;
  termInterest: number;
  amortInterest: number;
};

export type RateComparison = {
  current: RateQuote;
  other: RateQuote;
  /** Other payment minus the payment at the current rate, per period. */
  paymentDelta: number;
  /** Other term interest minus term interest at the current rate. */
  termInterestDelta: number;
  /** Other interest over the amortization minus interest at the current rate. */
  amortInterestDelta: number;
};

export type CompareRatesInput = {
  principal: number;
  /** Contract rate as a decimal. 0.05 is 5%. */
  annualRate: number;
  /** The other lender's rate as a decimal. */
  otherRate: number;
  amortYears: number;
  /** Years in the term. Missing, zero, or negative uses 5. */
  termYears?: number;
  frequency: FrequencyId;
  compounding: Compounding;
};

function quoteAt(
  principal: number,
  annualRate: number,
  amortYears: number,
  termYears: number,
  frequency: FrequencyId,
  compounding: Compounding,
): RateQuote {
  const quote = mortgagePayment(principal, annualRate, amortYears, frequency, compounding);
  const payoffPeriods = periodsUntilPayoff(
    principal,
    quote.periodicRate,
    quote.raw,
    quote.contractPeriods,
  );
  const term = termTotals(principal, quote, termYears, payoffPeriods);
  const life = termTotals(principal, quote, amortYears, payoffPeriods);
  return {
    payment: quote.rounded,
    termInterest: term.interest,
    amortInterest: life.interest,
  };
}

/** Same principal, amortization, frequency, and compounding. Differences are other minus current. */
export function compareRates(input: CompareRatesInput): RateComparison {
  const termYears = input.termYears != null && input.termYears > 0 ? input.termYears : 5;
  const current = quoteAt(
    input.principal,
    input.annualRate,
    input.amortYears,
    termYears,
    input.frequency,
    input.compounding,
  );
  const other = quoteAt(
    input.principal,
    input.otherRate,
    input.amortYears,
    termYears,
    input.frequency,
    input.compounding,
  );
  return {
    current,
    other,
    paymentDelta: roundCents(other.payment - current.payment),
    termInterestDelta: roundCents(other.termInterest - current.termInterest),
    amortInterestDelta: roundCents(other.amortInterest - current.amortInterest),
  };
}
