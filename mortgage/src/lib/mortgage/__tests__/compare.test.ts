import { describe, expect, it } from "vitest";
import { compareRates } from "../compare";
import { defaultInput } from "../scenario";
import { parseSearch, serialize } from "../url";

const fcac = {
  principal: 100_000,
  annualRate: 0.05,
  amortYears: 25,
  termYears: 5,
  frequency: "monthly" as const,
  compounding: "semi" as const,
};

describe("compare another rate", () => {
  it("matches the FCAC payment and the interest you can total by hand", () => {
    // $100,000 at 5% for 25 years, monthly, semi-annual compounding.
    // Published payment $581.60. Published balance after 5 years $88,507.50.
    // Interest over 5 years = 581.60 × 60 − (100,000 − 88,507.50) = 23,403.50.
    // Interest over 25 years = 581.60 × 300 − 100,000 = 74,480.
    const compared = compareRates({ ...fcac, otherRate: 0.04 });
    expect(compared.current.payment).toBe(581.6);
    expect(compared.current.termInterest).toBe(23403.5);
    expect(compared.current.amortInterest).toBe(74480);
  });

  it("returns a zero difference when the rates are equal", () => {
    const compared = compareRates({ ...fcac, otherRate: 0.05 });
    expect(compared.paymentDelta).toBe(0);
    expect(compared.termInterestDelta).toBe(0);
    expect(compared.amortInterestDelta).toBe(0);
    expect(compared.other).toEqual(compared.current);
  });

  it("returns a negative difference when the other rate is lower", () => {
    // 4% payment is $526.02, $55.58 less than $581.60 a month.
    const compared = compareRates({ ...fcac, otherRate: 0.04 });
    expect(compared.other.payment).toBe(526.02);
    expect(compared.paymentDelta).toBe(-55.58);
    expect(compared.termInterestDelta).toBe(-4788.39);
    expect(compared.amortInterestDelta).toBe(-16674);
    expect(compared.paymentDelta).toBeLessThan(0);
    expect(compared.termInterestDelta).toBeLessThan(0);
    expect(compared.amortInterestDelta).toBeLessThan(0);
  });

  it("uses five years when no term is given", () => {
    const implied = compareRates({
      principal: fcac.principal,
      annualRate: fcac.annualRate,
      otherRate: 0.04,
      amortYears: fcac.amortYears,
      frequency: fcac.frequency,
      compounding: fcac.compounding,
    });
    const explicit = compareRates({ ...fcac, otherRate: 0.04 });
    expect(implied).toEqual(explicit);
    expect(compareRates({ ...fcac, otherRate: 0.04, termYears: 0 })).toEqual(explicit);
  });
});

describe("other rate share link", () => {
  it("round-trips the other rate and leaves it out when empty", () => {
    const base = defaultInput();
    expect(serialize(base)).not.toContain("or=");
    expect(base.otherRatePercent).toBeNull();

    const filled = { ...base, otherRatePercent: 3.89 };
    const parsed = parseSearch(serialize(filled));
    expect(parsed.invalid).toBe(false);
    expect(parsed.input).toEqual(filled);
    expect(serialize(filled)).toContain("or=3.89");

    expect(parseSearch("?or=0").invalid).toBe(false);
    expect(parseSearch("?or=0").input.otherRatePercent).toBe(0);
    expect(parseSearch("?or=nope").invalid).toBe(true);
    expect(parseSearch("?or=nope").input.otherRatePercent).toBeNull();
    expect(parseSearch("?or=31").invalid).toBe(true);
    expect(parseSearch("?or=31").input.otherRatePercent).toBeNull();
  });
});
