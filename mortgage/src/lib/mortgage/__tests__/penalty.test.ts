import { describe, expect, it } from "vitest";
import { breakPenalty } from "../penalty";
import { defaultInput } from "../scenario";
import { parseSearch, serialize } from "../url";

const balance = 100_000;
const contractRate = 0.05;

describe("break-early penalty", () => {
  it("charges a variable mortgage three months of interest", () => {
    // A fixed reading of the same gap would use the interest-rate differential instead.
    const estimate = breakPenalty({
      rateType: "variable",
      balance,
      contractRate,
      monthsLeft: 36,
      comparisonRate: 0,
    });
    expect(estimate).toEqual({
      threeMonthsInterest: 1_250,
      ird: null,
      penalty: 1_250,
      binding: "three-months",
    });
  });

  it("uses three months of interest when that is greater than the fixed differential", () => {
    const estimate = breakPenalty({
      rateType: "fixed",
      balance,
      contractRate,
      monthsLeft: 12,
      comparisonRate: 0.04,
    });
    expect(estimate).toEqual({
      threeMonthsInterest: 1_250,
      ird: 1_000,
      penalty: 1_250,
      binding: "three-months",
    });
  });

  it("uses the interest-rate differential when that is greater", () => {
    const estimate = breakPenalty({
      rateType: "fixed",
      balance,
      contractRate,
      monthsLeft: 36,
      comparisonRate: 0.03,
    });
    expect(estimate).toEqual({
      threeMonthsInterest: 1_250,
      ird: 6_000,
      penalty: 6_000,
      binding: "ird",
    });
  });

  it("sets the differential to zero when the comparison rate is above the contract rate", () => {
    const estimate = breakPenalty({
      rateType: "fixed",
      balance,
      contractRate,
      monthsLeft: 36,
      comparisonRate: 0.08,
    });
    expect(estimate).toEqual({
      threeMonthsInterest: 1_250,
      ird: 0,
      penalty: 1_250,
      binding: "three-months",
    });
  });

  it("sets the differential to zero when no months are left", () => {
    const estimate = breakPenalty({
      rateType: "fixed",
      balance,
      contractRate,
      monthsLeft: 0,
      comparisonRate: 0.03,
    });
    expect(estimate).toEqual({
      threeMonthsInterest: 1_250,
      ird: 0,
      penalty: 1_250,
      binding: "three-months",
    });
  });
});

describe("break penalty share link", () => {
  it("round-trips the break year, months left, and comparison rate", () => {
    const base = defaultInput();
    const plain = serialize(base);
    expect(plain).not.toContain("by=");
    expect(plain).not.toContain("ml=");
    expect(plain).not.toContain("cr=");

    const filled = { ...base, breakYear: 2, breakMonthsLeft: 18, comparisonRatePercent: 3.25 };
    const parsed = parseSearch(serialize(filled));
    expect(parsed.invalid).toBe(false);
    expect(parsed.input).toEqual(filled);

    expect(parseSearch("?by=nope").invalid).toBe(true);
    expect(parseSearch("?by=nope").input.breakYear).toBe(0);
    expect(parseSearch("?ml=200").invalid).toBe(true);
    expect(parseSearch("?ml=200").input.breakMonthsLeft).toBeNull();
    expect(parseSearch("?cr=nope").invalid).toBe(true);
    expect(parseSearch("?cr=0").invalid).toBe(false);
    expect(parseSearch("?cr=0").input.comparisonRatePercent).toBe(0);
    expect(parseSearch("?ml=0").input.breakMonthsLeft).toBe(0);
  });
});
