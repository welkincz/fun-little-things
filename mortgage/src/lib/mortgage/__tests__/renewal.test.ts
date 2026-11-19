import { describe, expect, it } from "vitest";
import { mortgagePayment, periodicRate } from "../payment";
import { keepPaymentAmortization, type KeepPaymentAmortization } from "../renewal";
import { calculate, defaultInput } from "../scenario";

function cents(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) throw new Error(`not a number: ${value}`);
  return Math.round(value * 100);
}

function required(flat: KeepPaymentAmortization | null): KeepPaymentAmortization {
  if (flat == null) throw new Error("expected an amortization");
  return flat;
}

describe("amortization that keeps the current payment", () => {
  it("rounds the $200,000 shock up to the first month the payment fits", () => {
    // $200,000 at 4% for 25 years, semi-annual compounding, monthly: $1,052.04.
    // At 6% that payment needs 47 years and 4 months. One month shorter does not.
    const balance = 200_000;
    const current = mortgagePayment(balance, 0.04, 25, "monthly", "semi");
    expect(cents(current.rounded)).toBe(105204);

    const flat = required(keepPaymentAmortization(balance, 0.06, current.rounded, "monthly", "semi"));
    expect(flat).toEqual({ years: 47, months: 4 });

    const months = flat.years * 12 + flat.months;
    const at = mortgagePayment(balance, 0.06, months / 12, "monthly", "semi");
    const shorter = mortgagePayment(balance, 0.06, (months - 1) / 12, "monthly", "semi");
    expect(at.rounded).toBeLessThanOrEqual(current.rounded);
    expect(shorter.rounded).toBeGreaterThan(current.rounded);
    expect(cents(at.rounded)).toBe(105180);
    expect(cents(shorter.rounded)).toBe(105213);
  });

  it("returns nothing when the payment does not cover interest", () => {
    const balance = 100_000;
    const rate = 0.06;
    const interest = balance * periodicRate(rate, 12, "semi");
    expect(interest).toBeGreaterThan(493);
    expect(interest).toBeLessThan(494);
    expect(keepPaymentAmortization(balance, rate, 400, "monthly", "semi")).toBeNull();
    expect(keepPaymentAmortization(balance, rate, interest, "monthly", "semi")).toBeNull();
  });

  it("returns the original amortization when the rate is unchanged", () => {
    const balance = 200_000;
    const rate = 0.04;
    const current = mortgagePayment(balance, rate, 25, "monthly", "semi");
    const flat = required(keepPaymentAmortization(balance, rate, current.rounded, "monthly", "semi"));
    expect(flat).toEqual({ years: 25, months: 0 });

    const months = flat.years * 12 + flat.months;
    const at = mortgagePayment(balance, rate, months / 12, "monthly", "semi");
    const shorter = mortgagePayment(balance, rate, (months - 1) / 12, "monthly", "semi");
    expect(at.rounded).toBe(current.rounded);
    expect(shorter.rounded).toBeGreaterThan(current.rounded);
  });

  it("attaches that amortization to each $800k renewal row", () => {
    const result = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 160_000,
      ratePercent: 4.5,
      amortYears: 25,
      frequency: "monthly",
    });
    expect(cents(result.payment)).toBe(354223);
    const row = (label: string) => result.renewal?.find((item) => item.label === label);
    expect(row("Same rate")).toMatchObject({ payment: 3542.23, flatYears: 20, flatMonths: 0 });
    expect(row("+1%")).toMatchObject({ flatYears: 23, flatMonths: 5 });
    expect(row("+2%")).toMatchObject({ flatYears: 29, flatMonths: 6 });
  });
});
