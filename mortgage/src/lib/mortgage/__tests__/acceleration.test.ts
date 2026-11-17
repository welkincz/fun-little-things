import { describe, expect, it } from "vitest";
import { formatDollars } from "../../../format";
import { roundCents } from "../money";
import { mortgagePayment, periodsUntilPayoff, type Compounding, type FrequencyId } from "../payment";
import { calculate, defaultInput } from "../scenario";
import { yearlySchedule } from "../schedule";
import { accelerationVersusMonthly, formatAccelerationSavings } from "../acceleration";

function cents(value: number): number {
  return Math.round(value * 100);
}

/** Payoff and total interest from the existing engine, not a second formula. */
function scheduleFacts(
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
  return { periods, perYear: quote.perYear, payoffYears: periods / quote.perYear, interest };
}

function soonerFromSchedules(monthlyYears: number, acceleratedYears: number) {
  const deltaMonths = Math.max(0, Math.round((monthlyYears - acceleratedYears) * 12));
  return { years: Math.floor(deltaMonths / 12), months: deltaMonths % 12 };
}

function lineFor(years: number, months: number, interestSaved: number): string {
  const time =
    [years > 0 ? `${years} yr` : "", months > 0 ? `${months} mo` : ""].filter(Boolean).join(" ") || "0 mo";
  return `Paid off ${time} sooner · saves ${formatDollars(interestSaved)} interest vs monthly`;
}

describe("accelerated payoff versus monthly", () => {
  const input = {
    ...defaultInput(),
    price: 800_000,
    downPayment: 160_000,
    ratePercent: 4.5,
    amortYears: 25,
    frequency: "accel-biweekly" as const,
  };
  const scenario = calculate(input);
  const args = {
    loan: scenario.loan,
    annualRate: input.ratePercent / 100,
    amortYears: scenario.amortUsed,
    compounding: scenario.compounding,
  };

  it("pays the $800k / 20% / 4.5% / 25y mortgage off sooner and saves interest", () => {
    expect(scenario.premium).toBe(0);
    expect(scenario.loan).toBe(640_000);
    expect(args.amortYears).toBe(25);
    expect(args.annualRate).toBe(0.045);

    const monthly = scheduleFacts(args.loan, args.annualRate, args.amortYears, "monthly", args.compounding);
    const accelerated = scheduleFacts(
      args.loan,
      args.annualRate,
      args.amortYears,
      "accel-biweekly",
      args.compounding,
    );
    const savings = accelerationVersusMonthly({ ...args, frequency: "accel-biweekly" });
    const sooner = soonerFromSchedules(monthly.payoffYears, accelerated.payoffYears);

    expect(accelerated.payoffYears).toBeLessThan(25);
    expect(accelerated.payoffYears).toBeLessThan(monthly.payoffYears);
    expect(monthly.interest - accelerated.interest).toBeGreaterThan(0);
    expect(savings).not.toBeNull();
    expect(savings?.years).toBe(sooner.years);
    expect(savings?.months).toBe(sooner.months);
    expect(cents(savings?.interestSaved ?? 0)).toBe(cents(monthly.interest - accelerated.interest));
    expect(formatAccelerationSavings(savings!)).toBe(
      lineFor(sooner.years, sooner.months, monthly.interest - accelerated.interest),
    );
  });

  it("matches the accelerated weekly schedule the same way", () => {
    const monthly = scheduleFacts(args.loan, args.annualRate, args.amortYears, "monthly", args.compounding);
    const accelerated = scheduleFacts(
      args.loan,
      args.annualRate,
      args.amortYears,
      "accel-weekly",
      args.compounding,
    );
    const savings = accelerationVersusMonthly({ ...args, frequency: "accel-weekly" });
    const sooner = soonerFromSchedules(monthly.payoffYears, accelerated.payoffYears);

    expect(accelerated.payoffYears).toBeLessThan(monthly.payoffYears);
    expect(monthly.interest - accelerated.interest).toBeGreaterThan(0);
    expect(savings).toEqual({
      years: sooner.years,
      months: sooner.months,
      interestSaved: roundCents(monthly.interest - accelerated.interest),
    });
  });

  it("returns nothing for a frequency that is not accelerated", () => {
    for (const frequency of ["monthly", "semimonthly", "biweekly", "weekly"] as const) {
      expect(accelerationVersusMonthly({ ...args, frequency })).toBeNull();
    }
  });
});
