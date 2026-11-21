import { describe, expect, it } from "vitest";
import { formatPrepayOrInvest, prepayOrInvest } from "../lump";
import { defaultInput } from "../scenario";
import { parseSearch, serialize } from "../url";

const loan = 640_000;
const annualRate = 0.045;
const amortYears = 25;
const frequency = "monthly" as const;
const compounding = "semi" as const;
const lumpSum = 10_000;

function compare(annualReturn: number, account: "tfsa" | "taxable" = "tfsa", marginalTax = 0) {
  return prepayOrInvest({
    loan,
    annualRate,
    amortYears,
    frequency,
    compounding,
    lumpSum,
    annualReturn,
    marginalTax,
    account,
  });
}

describe("prepay or invest", () => {
  it("is roughly even in a TFSA when the return equals the mortgage rate", () => {
    const result = compare(annualRate);
    expect(result).not.toBeNull();
    const gap = Math.abs((result?.prepay ?? 0) - (result?.invest ?? 0));
    expect(gap / (result?.invest ?? 1)).toBeLessThan(0.02);
    const effective = (1 + annualRate / 2) ** 2 - 1;
    expect(Math.abs((result?.breakEvenReturn ?? 0) - effective)).toBeLessThan(0.0015);
  });

  it("lets prepaying win when the return is zero", () => {
    const result = compare(0);
    expect(result).not.toBeNull();
    expect(result?.ahead).toBe("prepay");
    expect(result?.prepay ?? 0).toBeGreaterThan(result?.invest ?? 0);
    expect(result?.interestSaved).toBe(132_167.41);
    expect(Math.abs((result?.prepay ?? 0) - (result?.invest ?? 0) - (result?.interestSaved ?? 0))).toBeLessThan(2);
    expect(formatPrepayOrInvest(result!)).toMatch(/^Prepaying comes out ahead by \$/);
  });

  it("prices a 7% TFSA return on the $640,000 mortgage", () => {
    const result = compare(0.07);
    expect(result).toMatchObject({
      prepay: 386_940.87,
      invest: 529_892.35,
      ahead: "invest",
      difference: 142_951.48,
    });
    expect(formatPrepayOrInvest(result!)).toBe("Investing comes out ahead by $142,951.");
  });

  it("lets investing win when the return is high", () => {
    const result = compare(0.15);
    expect(result).not.toBeNull();
    expect(result?.ahead).toBe("invest");
    expect(result?.invest ?? 0).toBeGreaterThan(result?.prepay ?? 0);
    expect(formatPrepayOrInvest(result!)).toMatch(/^Investing comes out ahead by \$/);
  });

  it("taxes non-registered growth at the marginal rate each year", () => {
    const tfsa = compare(0.1, "tfsa", 0.5);
    const untaxed = compare(0.1, "taxable", 0);
    const taxed = compare(0.1, "taxable", 0.5);
    const half = compare(0.05, "tfsa");
    expect(untaxed?.prepay).toBe(tfsa?.prepay);
    expect(untaxed?.invest).toBe(tfsa?.invest);
    expect(taxed?.prepay).toBe(half?.prepay);
    expect(taxed?.invest).toBe(half?.invest);
    expect(taxed?.invest ?? 0).toBeLessThan(tfsa?.invest ?? 0);
  });

  it("returns nothing without a lump sum or a usable return", () => {
    expect(
      prepayOrInvest({
        loan,
        annualRate,
        amortYears,
        frequency,
        compounding,
        lumpSum: 0,
        annualReturn: 0.05,
        marginalTax: 0,
        account: "tfsa",
      }),
    ).toBeNull();
    expect(compare(-0.01)).toBeNull();
    expect(compare(0.05, "taxable", 1.2)).toBeNull();
  });

  it("round-trips the return and tax rate, and omits them when empty", () => {
    const base = defaultInput();
    expect(base.investReturnPercent).toBeNull();
    expect(base.marginalTaxPercent).toBeNull();
    expect(base.investAccount).toBe("tfsa");
    const plain = serialize(base);
    expect(plain).not.toContain("ir=");
    expect(plain).not.toContain("tx=");
    expect(plain).not.toContain("ac=");

    const filled = {
      ...base,
      lumpSum: 10_000,
      investReturnPercent: 6.5,
      marginalTaxPercent: 43.5,
      investAccount: "taxable" as const,
    };
    const query = serialize(filled);
    expect(query).toContain("ls=10000");
    expect(query).toContain("ir=6.5");
    expect(query).toContain("tx=43.5");
    expect(query).toContain("ac=n");
    expect(parseSearch(query).invalid).toBe(false);
    expect(parseSearch(query).input).toEqual(filled);

    expect(parseSearch("?ir=0").invalid).toBe(false);
    expect(parseSearch("?ir=0").input.investReturnPercent).toBe(0);
    expect(parseSearch("?ir=nope").invalid).toBe(true);
    expect(parseSearch("?ir=nope").input.investReturnPercent).toBeNull();
    expect(parseSearch("?tx=-1").invalid).toBe(true);
    expect(parseSearch("?ac=x").invalid).toBe(true);
    expect(parseSearch("?ac=t").input.investAccount).toBe("tfsa");
  });
});
