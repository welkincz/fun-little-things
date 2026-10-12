import { describe, expect, it } from "vitest";
import { isInsurable, minDownPayment } from "../down";
import { ontarioLtt, ontarioRebate, torontoMltt, torontoRebate } from "../ltt";
import { parseAmount } from "../money";
import { balanceAfterPayments, mortgagePayment } from "../payment";
import { cmhcPremiumRate } from "../premium";
import { stressRate } from "../qualify";
import { renewalPayment } from "../renewal";
import { calculate, defaultInput, type CalculatorInput } from "../scenario";
import { parseSearch, serialize } from "../url";

function cents(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) throw new Error(`not a number: ${value}`);
  return Math.round(value * 100);
}

describe("section 6 vectors", () => {
  it("matches nesto's $500,000 worked example", () => {
    const quote = mortgagePayment(500_000, 0.04, 25, "monthly", "semi");
    expect(cents(quote.rounded)).toBe(263010);
  });

  it("matches the FCAC default payment and 5-year balance", () => {
    const quote = mortgagePayment(100_000, 0.05, 25, "monthly", "semi");
    expect(cents(quote.rounded)).toBe(58160);
    expect(cents(balanceAfterPayments(100_000, quote.periodicRate, quote.raw, 60))).toBe(8850750);
  });

  it("matches Ontario and Toronto land transfer tax figures", () => {
    expect(cents(ontarioLtt(400_000, true))).toBe(447500);
    expect(cents(ontarioLtt(368_000, true))).toBe(399500);
    expect(cents(ontarioRebate(ontarioLtt(368_000, true), true))).toBe(399500);
    expect(cents(ontarioLtt(800_000, true))).toBe(1247500);
    expect(cents(torontoMltt(800_000, true))).toBe(1247500);
    expect(cents(ontarioLtt(800_000, true) - 4_000 + (torontoMltt(800_000, true) - 4_475))).toBe(1647500);
    expect(cents(ontarioLtt(1_000_000, true))).toBe(1647500);
    expect(cents(torontoMltt(1_000_000, true))).toBe(1647500);
    expect(cents(ontarioLtt(3_500_000, true))).toBe(7397500);
    expect(cents(torontoMltt(3_500_000, true))).toBe(8347500);
  });

  it("matches the minimum down payment schedule", () => {
    expect(cents(minDownPayment(400_000))).toBe(2_000_000);
    expect(cents(minDownPayment(600_000))).toBe(3_500_000);
    expect(cents(minDownPayment(800_000))).toBe(5_500_000);
    expect(cents(minDownPayment(1_000_000))).toBe(7_500_000);
    expect(cents(minDownPayment(1_500_000))).toBe(30_000_000);
  });

  it("matches the $800,000 Toronto worked example", () => {
    const input: CalculatorInput = {
      ...defaultInput(),
      price: 800_000,
      location: "to",
      firstTime: true,
      citizen: true,
      newBuild: false,
      downPayment: 80_000,
      ratePercent: 4.09,
      rateType: "fixed",
      amortYears: 30,
      termYears: 5,
      frequency: "monthly",
      payPremiumInCash: false,
      renewalCustomPercent: 5,
    };
    const result = calculate(input);
    expect(result.blocked).toBeNull();
    expect(cents(result.baseLoan)).toBe(72_000_000);
    expect(result.premiumRate).toBeCloseTo(0.033, 10);
    expect(cents(result.premium)).toBe(2_376_000);
    expect(cents(result.pst)).toBe(190080);
    expect(cents(result.loan)).toBe(74_376_000);
    expect(cents(result.payment)).toBe(357470);
    expect(result.stress).toBeCloseTo(0.0609, 10);
    expect(cents(result.qualifyingPayment)).toBe(446598);
    expect(cents(result.endBalance)).toBe(67331441);
    expect(result.years.find((row) => row.year === 5)?.balance).toBe(result.endBalance);
    const custom = result.renewal?.find((row) => row.label === "Custom");
    expect(cents(custom?.payment)).toBe(391603);
    const atSix = renewalPayment(673_314.41, 0.06, 25, "monthly", "semi");
    expect(cents(atSix.rounded)).toBe(430791);

    const accelerated = calculate({ ...input, frequency: "accel-biweekly", renewalCustomPercent: null });
    expect(cents(accelerated.payment)).toBe(178735);
    expect(Math.round((accelerated.payoffYears ?? 0) * 100) / 100).toBe(25.85);
    expect(cents(result.cashToClose)).toBe(9_837_580);
    expect(cents(result.ontarioTax - result.ontarioRebate)).toBe(847500);
    expect(cents(result.torontoTax - result.torontoRebate)).toBe(800000);
  });
});

describe("rules that sit beside the vectors", () => {
  it("does not charge a premium at 80% LTV and steps the high-ratio bands", () => {
    expect(cmhcPremiumRate(0.8, 25)).toBe(0);
    expect(cmhcPremiumRate(0.8001, 25)).toBe(0.028);
    expect(cmhcPremiumRate(0.8001, 30)).toBe(0.03);
    expect(cmhcPremiumRate(0.9, 25)).toBe(0.031);
    expect(cmhcPremiumRate(0.9, 30)).toBe(0.033);
    expect(cmhcPremiumRate(0.9001, 25)).toBe(0.04);
    expect(cmhcPremiumRate(0.95, 25, true)).toBe(0.045);
  });

  it("keeps other property on the 2% bracket above $2,000,000", () => {
    expect(cents(ontarioLtt(3_500_000, false))).toBe(6_647_500);
    expect(cents(torontoMltt(3_500_000, false))).toBe(6_647_500);
  });

  it("withholds rebates and Ontario sales tax outside their rules", () => {
    expect(ontarioRebate(12_475, false)).toBe(0);
    expect(torontoRebate(12_475, false)).toBe(0);
    const other = calculate({
      ...defaultInput(),
      location: "ot",
      downPayment: 80_000,
      price: 800_000,
      firstTime: true,
      citizen: false,
    });
    expect(other.pst).toBe(0);
    expect(other.ontarioTax).toBe(0);
    expect(other.torontoTax).toBe(0);
    expect(other.rebateEligible).toBe(false);
  });

  it("uses 5.25% when the contract rate plus 2 points is lower", () => {
    expect(stressRate(0.02)).toBeCloseTo(0.0525, 10);
    expect(stressRate(0.0409)).toBeCloseTo(0.0609, 10);
  });

  it("blocks a $1,500,000 purchase with less than 20% down", () => {
    expect(isInsurable(1_500_000, 150_000)).toBe(false);
    const blocked = calculate({ ...defaultInput(), price: 1_500_000, downPayment: 150_000 });
    expect(blocked.blocked).toBe("not-insurable");
    expect(cents(blocked.minimumDown)).toBe(30_000_000);
    const allowed = calculate({ ...defaultInput(), price: 1_500_000, downPayment: 300_000, amortYears: 30 });
    expect(allowed.blocked).toBeNull();
    expect(allowed.premium).toBe(0);
    expect(allowed.uninsuredAmortAssumption).toBe(true);
  });

  it("caps an insured 30-year amortization when the buyer is not eligible", () => {
    const capped = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 80_000,
      firstTime: false,
      newBuild: false,
      amortYears: 30,
    });
    expect(capped.amortCapped).toBe(true);
    expect(capped.amortUsed).toBe(25);
    expect(capped.premiumRate).toBeCloseTo(0.031, 10);

    const build = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 80_000,
      firstTime: false,
      newBuild: true,
      amortYears: 30,
      ratePercent: 4.09,
    });
    expect(build.amortCapped).toBe(false);
    expect(build.amortUsed).toBe(30);
    expect(build.premiumRate).toBeCloseTo(0.033, 10);
  });

  it("asks for income instead of failing a blank affordability form", () => {
    const result = calculate(defaultInput());
    expect(result.qualify?.status).toBe("need-income");
    expect(result.qualify?.gds).toBeNull();
  });

  it("changes the payment when variable compounding changes", () => {
    const base = {
      ...defaultInput(),
      rateType: "variable" as const,
      downPayment: 200_000,
      price: 800_000,
    };
    const monthly = calculate({ ...base, variableCompounding: "monthly" });
    const semi = calculate({ ...base, variableCompounding: "semi" });
    expect(monthly.payment).not.toBe(semi.payment);
    expect(monthly.compounding).toBe("monthly");
    expect(semi.compounding).toBe("semi");
  });

  it("round-trips the share URL and rejects an unknown parameter", () => {
    const input = calculate({
      ...defaultInput(),
      price: 650_000,
      downPayment: 50_000,
      ratePercent: 4.09,
      frequency: "accel-biweekly",
      income: 180_000,
    });
    expect(input.blocked).toBeNull();
    const source: CalculatorInput = {
      ...defaultInput(),
      price: 650_000,
      downPayment: 50_000,
      ratePercent: 4.09,
      frequency: "accel-biweekly",
      income: 180_000,
      location: "on",
      renewalCustomPercent: 6,
    };
    const parsed = parseSearch(serialize(source));
    expect(parsed.invalid).toBe(false);
    expect(parsed.input).toEqual(source);
    const broken = parseSearch("?p=800000&nope=1");
    expect(broken.invalid).toBe(true);
    expect(broken.input.price).toBe(800_000);
  });

  it("recalculates the worked example well under 100ms", () => {
    const input: CalculatorInput = {
      ...defaultInput(),
      price: 800_000,
      downPayment: 80_000,
      ratePercent: 4.09,
      amortYears: 30,
      frequency: "monthly",
    };
    const start = performance.now();
    for (let i = 0; i < 20; i += 1) calculate(input);
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("reads the shorthand 800k", () => {
    expect(parseAmount("800k")).toBe(800_000);
    expect(parseAmount("$1.5m")).toBe(1_500_000);
    expect(parseAmount("55,000")).toBe(55_000);
  });
});
