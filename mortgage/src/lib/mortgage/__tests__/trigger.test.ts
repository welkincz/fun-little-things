import { describe, expect, it } from "vitest";
import { periodicRate } from "../payment";
import { calculate, defaultInput } from "../scenario";
import { triggerRate, triggerRateSentence } from "../trigger";

function cents(value: number): number {
  return Math.round(value * 100);
}

describe("variable-rate trigger rate", () => {
  it("matches a hand-checked $640,000 monthly payment", () => {
    // Default inputs at 20% down: $640,000, 4.50%, 25 years, monthly, $3,542.23.
    // Variable convention is monthly compounding. For monthly payments
    // i = r/12, so r = 12 × 3,542.23 / 640,000 = 0.0664168125 (6.64168125%).
    // That is 2.14168125 percentage points above 4.50%.
    const result = triggerRate({
      balance: 640_000,
      payment: 3542.23,
      frequency: "monthly",
      currentRate: 0.045,
    });
    expect(result).not.toBeNull();
    expect(result?.annualRate).toBeCloseTo(0.0664168125, 10);
    expect(result?.pointsAbove).toBeCloseTo(0.0214168125, 10);
  });

  it("charges interest equal to the payment at the trigger rate, within 1 cent", () => {
    const balance = 640_000;
    const payment = 3542.23;
    const result = triggerRate({
      balance,
      payment,
      frequency: "monthly",
      currentRate: 0.045,
    });
    const interest = balance * periodicRate(result?.annualRate ?? 0, 12, "monthly");
    expect(Math.abs(cents(interest) - cents(payment))).toBeLessThanOrEqual(1);
  });

  it("uses monthly compounding for a non-monthly frequency", () => {
    const balance = 100_000;
    const payment = 500;
    const result = triggerRate({
      balance,
      payment,
      frequency: "biweekly",
      currentRate: 0.04,
    });
    expect(result).not.toBeNull();
    // 12 × payment / balance is the monthly shortcut and is the wrong rate here.
    expect(result?.annualRate).not.toBeCloseTo((12 * payment) / balance, 4);
    const interest = balance * periodicRate(result?.annualRate ?? 0, 26, "monthly");
    expect(Math.abs(cents(interest) - cents(payment))).toBeLessThanOrEqual(1);
  });

  it("is higher at the smaller renewal balance for the same payment", () => {
    const result = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 160_000,
      ratePercent: 4.5,
      amortYears: 25,
      frequency: "monthly",
    });
    const start = triggerRate({
      balance: result.loan,
      payment: result.payment ?? 0,
      frequency: "monthly",
      currentRate: 0.045,
    });
    const renewal = triggerRate({
      balance: result.endBalance ?? 0,
      payment: result.payment ?? 0,
      frequency: "monthly",
      currentRate: 0.045,
    });
    expect(result.loan).toBe(640_000);
    expect(result.payment).toBe(3542.23);
    expect(renewal?.annualRate ?? 0).toBeGreaterThan(start?.annualRate ?? 0);
    const interest = (result.endBalance ?? 0) * periodicRate(renewal?.annualRate ?? 0, 12, "monthly");
    expect(Math.abs(cents(interest) - cents(result.payment ?? 0))).toBeLessThanOrEqual(1);
  });

  it("returns nothing when the balance or payment cannot define a rate", () => {
    const ok = { balance: 640_000, payment: 3542.23, frequency: "monthly" as const, currentRate: 0.045 };
    expect(triggerRate({ ...ok, balance: 0 })).toBeNull();
    expect(triggerRate({ ...ok, payment: 0 })).toBeNull();
    expect(triggerRate({ ...ok, currentRate: Number.NaN })).toBeNull();
    expect(triggerRate({ ...ok, balance: -1 })).toBeNull();
  });

  it("states when the payment stops covering interest", () => {
    expect(triggerRateSentence(0.0664168125)).toBe(
      "If your variable rate rises above 6.64%, your payment no longer covers the interest and your balance stops going down.",
    );
  });
});
