import { describe, expect, it } from "vitest";
import { mortgagePayment } from "../payment";
import { maxQualifyingPrincipal, qualify, stressRate, type MaxPrincipalInput } from "../qualify";
import { GDS_LIMIT, TDS_LIMIT } from "../rules";

const base: MaxPrincipalInput = {
  annualRate: 0.045,
  amortYears: 25,
  compounding: "semi",
  incomeAnnual: 120_000,
  propertyTax: 4_800,
  taxPeriod: "year",
  heatMonthly: 150,
  condoMonthly: 300,
  otherDebtsMonthly: 0,
  revolvingBalance: 0,
};

function atLimit(input: MaxPrincipalInput) {
  const solved = maxQualifyingPrincipal(input);
  expect(solved).not.toBeNull();
  const payment = mortgagePayment(
    solved!.principal,
    stressRate(input.annualRate),
    input.amortYears,
    "monthly",
    input.compounding,
  ).rounded;
  const costs = {
    incomeAnnual: input.incomeAnnual,
    propertyTax: input.propertyTax,
    taxPeriod: input.taxPeriod,
    heatMonthly: input.heatMonthly,
    condoMonthly: input.condoMonthly,
    otherDebtsMonthly: input.otherDebtsMonthly,
    revolvingBalance: input.revolvingBalance,
  };
  const result = qualify({ qualifyingPayment: payment, ...costs });
  const over = qualify({ qualifyingPayment: payment + 1, ...costs });
  const incomeMonthly = (input.incomeAnnual ?? 0) / 12;
  return {
    solved: solved!,
    payment,
    result,
    over,
    gdsRoom: GDS_LIMIT * incomeMonthly - result.housingMonthly,
    tdsRoom: TDS_LIMIT * incomeMonthly - result.debtMonthly,
  };
}

describe("max qualifying principal", () => {
  it("round-trips to the GDS limit within $1", () => {
    for (const compounding of ["semi", "monthly"] as const) {
      const { solved, result, over, gdsRoom, tdsRoom } = atLimit({ ...base, compounding });
      expect(solved.binding).toBe("gds");
      expect(solved.principal).toBeGreaterThan(0);
      expect(result.status).toBe("pass");
      expect(gdsRoom).toBeGreaterThanOrEqual(0);
      expect(gdsRoom).toBeLessThanOrEqual(1);
      expect(tdsRoom).toBeGreaterThan(gdsRoom);
      expect(over.status === "gds" || over.status === "both").toBe(true);
    }
  });

  it("is limited by TDS when other debts use the extra room", () => {
    const { solved, result, over, gdsRoom, tdsRoom } = atLimit({
      ...base,
      annualRate: 0.05,
      incomeAnnual: 100_000,
      propertyTax: 3_600,
      heatMonthly: 120,
      condoMonthly: null,
      otherDebtsMonthly: 900,
      revolvingBalance: 8_000,
    });
    expect(solved.binding).toBe("tds");
    expect(result.status).toBe("pass");
    expect(tdsRoom).toBeGreaterThanOrEqual(0);
    expect(tdsRoom).toBeLessThanOrEqual(1);
    expect(gdsRoom).toBeGreaterThan(1);
    expect(over.status === "tds" || over.status === "both").toBe(true);
  });

  it("names both limits when they allow the same payment", () => {
    const solved = maxQualifyingPrincipal({
      ...base,
      propertyTax: 0,
      heatMonthly: 0,
      condoMonthly: 0,
      otherDebtsMonthly: 500,
      revolvingBalance: 0,
    });
    expect(solved?.binding).toBe("both");
  });

  it("returns nothing when income is missing or zero", () => {
    expect(maxQualifyingPrincipal({ ...base, incomeAnnual: null })).toBeNull();
    expect(maxQualifyingPrincipal({ ...base, incomeAnnual: 0 })).toBeNull();
  });
});
