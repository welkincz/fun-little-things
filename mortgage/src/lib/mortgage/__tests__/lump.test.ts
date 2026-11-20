import { describe, expect, it } from "vitest";
import { roundCents } from "../money";
import { mortgagePayment, periodsUntilPayoff, type Compounding, type FrequencyId } from "../payment";
import { calculate, defaultInput } from "../scenario";
import { yearlySchedule } from "../schedule";
import { formatYearlyLumpSum, yearlyLumpSum } from "../lump";
import { parseSearch, serialize } from "../url";

function cents(value: number | null): number {
  if (value == null) throw new Error("missing amount");
  return Math.round(value * 100);
}

/** Payoff and total interest from the existing engine, not a second formula. */
function baseline(
  loan: number,
  annualRate: number,
  amortYears: number,
  frequency: FrequencyId,
  compounding: Compounding,
) {
  const quote = mortgagePayment(loan, annualRate, amortYears, frequency, compounding);
  const periods = periodsUntilPayoff(loan, quote.periodicRate, quote.raw, quote.contractPeriods);
  const interest = roundCents(
    yearlySchedule(loan, quote, periods).reduce((sum, row) => sum + row.interest, 0),
  );
  return { payoffYears: periods / quote.perYear, interest, payment: quote.rounded };
}

const loan = 640_000;
const annualRate = 0.045;
const amortYears = 25;
const frequency = "monthly" as const;
const compounding = "semi" as const;

describe("yearly lump sum", () => {
  it("matches the no-prepayment schedule exactly when the lump sum is zero", () => {
    const plain = baseline(loan, annualRate, amortYears, frequency, compounding);
    const result = yearlyLumpSum({ loan, annualRate, amortYears, frequency, compounding, lumpSum: 0 });
    expect(result).not.toBeNull();
    expect(result?.payoffYears).toBe(plain.payoffYears);
    expect(cents(result?.interest ?? 0)).toBe(cents(plain.interest));
    expect(result?.years).toBe(0);
    expect(result?.months).toBe(0);
    expect(result?.interestSaved).toBe(0);
  });

  it("pays the loan off at the first anniversary when the lump sum covers the balance", () => {
    const covered = yearlyLumpSum({
      loan,
      annualRate,
      amortYears,
      frequency,
      compounding,
      lumpSum: loan,
    });
    const larger = yearlyLumpSum({
      loan,
      annualRate,
      amortYears,
      frequency,
      compounding,
      lumpSum: loan + 50_000,
    });
    expect(covered?.payoffYears).toBe(1);
    expect(larger).toEqual(covered);
    expect(covered?.interest).toBeGreaterThan(0);
    expect(covered?.years).toBeGreaterThan(0);
    expect(covered?.interestSaved).toBeGreaterThan(0);
  });

  it("pays a $640,000 mortgage off sooner with $10,000 a year", () => {
    const plain = baseline(loan, annualRate, amortYears, frequency, compounding);
    // $3,542.23 × 300 payments − $640,000 principal.
    expect(cents(plain.payment)).toBe(354223);
    expect(plain.interest).toBe(422_669);
    expect(plain.payoffYears).toBe(25);

    const input = {
      ...defaultInput(),
      price: 800_000,
      downPayment: 160_000,
      ratePercent: 4.5,
      amortYears: 25,
      frequency,
      lumpSum: 10_000,
    };
    const scenario = calculate(input);
    expect(scenario.loan).toBe(loan);
    expect(scenario.amortUsed).toBe(amortYears);
    expect(scenario.compounding).toBe(compounding);

    const result = yearlyLumpSum({
      loan: scenario.loan,
      annualRate,
      amortYears: scenario.amortUsed,
      frequency: input.frequency,
      compounding: scenario.compounding,
      lumpSum: input.lumpSum,
    });
    // 17 anniversaries, then 11 more payments: month 215, 7 years 1 month before year 25.
    expect(result).not.toBeNull();
    expect((result?.years ?? 0) * 12 + (result?.months ?? 0)).toBeGreaterThan(0);
    expect(result?.interestSaved).toBeGreaterThan(0);
    expect(result?.payoffYears).toBeLessThan(plain.payoffYears);
    expect(result?.interest).toBeLessThan(plain.interest);
    expect(result).toEqual({
      payoffYears: 215 / 12,
      interest: 290_501.59,
      years: 7,
      months: 1,
      interestSaved: 132_167.41,
    });
    expect(cents(plain.interest - (result?.interest ?? 0))).toBe(cents(result?.interestSaved ?? 0));
    expect(formatYearlyLumpSum(result!)).toBe(
      "Paid off 7 yr 1 mo sooner and saves $132,167 in interest.",
    );

    const monthlyCompounding = yearlyLumpSum({
      loan,
      annualRate,
      amortYears,
      frequency,
      compounding: "monthly",
      lumpSum: 10_000,
    });
    expect(monthlyCompounding?.interest).not.toBe(result?.interest);
  });

  it("leaves the $3,542.23 payment unchanged", () => {
    const result = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 160_000,
      ratePercent: 4.5,
      amortYears: 25,
      frequency: "monthly",
      lumpSum: 10_000,
    });
    expect(cents(result.payment)).toBe(354223);
  });

  it("keeps a zero lump sum out of the link and round-trips a positive one", () => {
    const base = defaultInput();
    expect(base.lumpSum).toBe(0);
    expect(serialize(base)).not.toContain("ls=");
    const query = serialize({ ...base, lumpSum: 10_000 });
    expect(query).toContain("ls=10000");
    const parsed = parseSearch(query);
    expect(parsed.invalid).toBe(false);
    expect(parsed.input).toEqual({ ...base, lumpSum: 10_000 });
  });

  it("rejects a lump sum that is not a money amount", () => {
    expect(parseSearch("?ls=abc").invalid).toBe(true);
    expect(parseSearch("?ls=abc").input.lumpSum).toBe(0);
    expect(parseSearch("?ls=-5").invalid).toBe(true);
    expect(parseSearch("?ls=-5").input.lumpSum).toBe(0);
  });
});
