import { describe, expect, it } from "vitest";
import { formatCAD, formatDollars } from "../../../format";
import { roundCents } from "../money";
import { mortgagePayment, periodsUntilPayoff, type FrequencyId } from "../payment";
import { defaultInput } from "../scenario";
import { yearlySchedule } from "../schedule";
import { formatPaymentTopUp, paymentTopUp } from "../topup";
import { parseSearch, serialize } from "../url";

function interest(loan: number, quote: ReturnType<typeof mortgagePayment>, periods: number): number {
  return roundCents(yearlySchedule(loan, quote, periods).reduce((sum, row) => sum + row.interest, 0));
}

describe("payment top-up", () => {
  it("matches the ordinary payment when nothing is added", () => {
    const loan = 640_000;
    const quote = mortgagePayment(loan, 0.045, 25, "monthly", "semi");
    const result = paymentTopUp({ loan, quote, extra: 0 });
    expect(quote.rounded).toBe(3542.23);
    expect(result).toEqual({
      payment: 3542.23,
      years: 0,
      months: 0,
      interestSaved: 0,
    });
  });

  it("rejects an extra that is not a positive amount of money", () => {
    const quote = mortgagePayment(1_000, 0.12, 2, "monthly", "monthly");
    expect(paymentTopUp({ loan: 1_000, quote, extra: -10 })).toBeNull();
    expect(paymentTopUp({ loan: 1_000, quote, extra: Number.NaN })).toBeNull();
    expect(paymentTopUp({ loan: 0, quote, extra: 100 })).toBeNull();
  });

  it("pays a $1,000 loan off in three $500 payments", () => {
    // 12% compounded monthly is 1% per month. A $1,000 balance with a $500 payment:
    //   month 1: 1,000 × 1.01 − 500 = 510
    //   month 2: 510 × 1.01 − 500 = 15.10
    //   month 3: 15.10 × 1.01 = 15.251, which rounds to $15.25
    // Interest is 500 + 500 + 15.25 − 1,000 = $15.25.
    // The same loan on a 2-year amortization pays $47.07 and $129.68 of interest.
    const loan = 1_000;
    const quote = mortgagePayment(loan, 0.12, 2, "monthly", "monthly");
    expect(quote.rounded).toBe(47.07);
    const periods = periodsUntilPayoff(loan, quote.periodicRate, quote.raw, quote.contractPeriods);
    expect(periods).toBe(24);
    expect(interest(loan, quote, periods)).toBe(129.68);

    const result = paymentTopUp({ loan, quote, extra: roundCents(500 - quote.rounded) });
    expect(result).toEqual({
      payment: 500,
      years: 1,
      months: 9,
      interestSaved: 114.43,
    });
    expect(formatPaymentTopUp(result!)).toBe(
      `Each payment becomes ${formatCAD(500)}. Paid off 1 yr 9 mo sooner and saves ${formatDollars(114.43)} in interest.`,
    );
  });

  it("pays the $640,000 mortgage off 2 years 3 months sooner with $200 more each month", () => {
    const loan = 640_000;
    const quote = mortgagePayment(loan, 0.045, 25, "monthly", "semi");
    const result = paymentTopUp({ loan, quote, extra: 200 });
    expect(result).toEqual({
      payment: 3742.23,
      years: 2,
      months: 3,
      interestSaved: 44525.7,
    });
    expect(formatPaymentTopUp(result!)).toBe(
      "Each payment becomes $3,742.23. Paid off 2 yr 3 mo sooner and saves $44,526 in interest.",
    );
  });

  it("pays off inside the first year when the top-up covers the balance", () => {
    const loan = 640_000;
    const quote = mortgagePayment(loan, 0.045, 25, "monthly", "semi");
    // One month of interest on $640,000 at this rate is $2,377.80.
    const covered = paymentTopUp({ loan, quote, extra: loan });
    const larger = paymentTopUp({ loan, quote, extra: loan + 50_000 });
    expect(covered).toEqual({
      payment: roundCents(quote.rounded + loan),
      years: 24,
      months: 11,
      interestSaved: 420_291.2,
    });
    expect(larger?.years).toBe(covered?.years);
    expect(larger?.months).toBe(covered?.months);
    expect(larger?.interestSaved).toBe(covered?.interestSaved);
    expect(larger?.payment).toBe(roundCents(quote.rounded + loan + 50_000));
  });

  it("uses the quote's frequency, including an accelerated one", () => {
    const loan = 640_000;
    for (const frequency of ["biweekly", "accel-weekly"] as const satisfies readonly FrequencyId[]) {
      const quote = mortgagePayment(loan, 0.045, 25, frequency, "semi");
      const extra = 50;
      const result = paymentTopUp({ loan, quote, extra });
      expect(result?.payment).toBe(roundCents(quote.rounded + extra));
      expect((result?.years ?? 0) * 12 + (result?.months ?? 0)).toBeGreaterThan(0);
      expect(result?.interestSaved).toBeGreaterThan(0);
    }
  });
});

describe("payment top-up share link", () => {
  it("keeps a blank top-up out of the link and round-trips a positive one", () => {
    const base = defaultInput();
    expect(base.topUp).toBeNull();
    expect(serialize(base)).not.toContain("tp=");
    const query = serialize({ ...base, topUp: 200 });
    expect(query).toContain("tp=200");
    const parsed = parseSearch(query);
    expect(parsed.invalid).toBe(false);
    expect(parsed.input).toEqual({ ...base, topUp: 200 });
  });

  it("rejects a top-up that is not a money amount", () => {
    expect(parseSearch("?tp=abc").invalid).toBe(true);
    expect(parseSearch("?tp=abc").input.topUp).toBeNull();
    expect(parseSearch("?tp=-5").invalid).toBe(true);
    expect(parseSearch("?tp=-5").input.topUp).toBeNull();
  });
});
