import { roundCents } from "./money";
import { principalForMonthlyPayment, type Compounding } from "./payment";
import { GDS_LIMIT, REVOLVING_FACTOR, STRESS_FLOOR, TDS_LIMIT } from "./rules";

export function stressRate(annualRate: number): number {
  return Math.max(annualRate + 0.02, STRESS_FLOOR);
}

export type QualifyInput = {
  qualifyingPayment: number;
  incomeAnnual: number | null;
  propertyTax: number | null;
  taxPeriod: "month" | "year";
  heatMonthly: number | null;
  condoMonthly: number | null;
  otherDebtsMonthly: number | null;
  revolvingBalance: number | null;
};

export type QualifyResult = {
  status: "need-income" | "pass" | "gds" | "tds" | "both";
  gds: number | null;
  tds: number | null;
  housingMonthly: number;
  debtMonthly: number;
  assumedZeroCosts: boolean;
  gdsLimit: number;
  tdsLimit: number;
};

type CostInput = {
  propertyTax: number | null;
  taxPeriod: "month" | "year";
  heatMonthly: number | null;
  condoMonthly: number | null;
  otherDebtsMonthly: number | null;
  revolvingBalance: number | null;
};

function carryingCosts(input: CostInput) {
  const tax =
    input.propertyTax == null
      ? 0
      : input.taxPeriod === "year"
        ? input.propertyTax / 12
        : input.propertyTax;
  const heat = input.heatMonthly ?? 0;
  const condo = input.condoMonthly ?? 0;
  const debts = input.otherDebtsMonthly ?? 0;
  const revolving = input.revolvingBalance ?? 0;
  const assumedZeroCosts =
    input.propertyTax == null ||
    input.heatMonthly == null ||
    input.condoMonthly == null ||
    input.otherDebtsMonthly == null ||
    input.revolvingBalance == null;
  return {
    housingExtra: tax + heat + 0.5 * condo,
    debtExtra: debts + REVOLVING_FACTOR * revolving,
    assumedZeroCosts,
  };
}

export function qualify(input: QualifyInput): QualifyResult {
  const costs = carryingCosts(input);
  const housingMonthly = input.qualifyingPayment + costs.housingExtra;
  const debtMonthly = housingMonthly + costs.debtExtra;
  const assumedZeroCosts = costs.assumedZeroCosts;

  if (!(input.incomeAnnual != null && input.incomeAnnual > 0)) {
    return {
      status: "need-income",
      gds: null,
      tds: null,
      housingMonthly,
      debtMonthly,
      assumedZeroCosts,
      gdsLimit: GDS_LIMIT,
      tdsLimit: TDS_LIMIT,
    };
  }

  const incomeMonthly = input.incomeAnnual / 12;
  const gds = housingMonthly / incomeMonthly;
  const tds = debtMonthly / incomeMonthly;
  const gdsFail = gds > GDS_LIMIT + 1e-12;
  const tdsFail = tds > TDS_LIMIT + 1e-12;
  const status = gdsFail && tdsFail ? "both" : gdsFail ? "gds" : tdsFail ? "tds" : "pass";
  return {
    status,
    gds,
    tds,
    housingMonthly,
    debtMonthly,
    assumedZeroCosts,
    gdsLimit: GDS_LIMIT,
    tdsLimit: TDS_LIMIT,
  };
}

export type MaxPrincipalInput = CostInput & {
  /** Contract rate as a decimal. The stress-test rate is applied inside. */
  annualRate: number;
  amortYears: number;
  compounding: Compounding;
  incomeAnnual: number | null;
};

export type MaxPrincipal = {
  principal: number;
  /** Which ratio uses up the room first. */
  binding: "gds" | "tds" | "both";
};

/** Largest mortgage whose stress-test payment keeps GDS and TDS within the CMHC limits. */
export function maxQualifyingPrincipal(input: MaxPrincipalInput): MaxPrincipal | null {
  if (!(input.incomeAnnual != null && input.incomeAnnual > 0)) return null;

  const incomeMonthly = input.incomeAnnual / 12;
  const costs = carryingCosts(input);
  const maxPayGds = GDS_LIMIT * incomeMonthly - costs.housingExtra;
  const maxPayTds = TDS_LIMIT * incomeMonthly - costs.housingExtra - costs.debtExtra;
  const binding: MaxPrincipal["binding"] =
    Math.abs(maxPayGds - maxPayTds) <= 0.01 ? "both" : maxPayTds < maxPayGds ? "tds" : "gds";
  const cap = Math.min(maxPayGds, maxPayTds);
  const payment = Math.floor(Math.max(0, cap) * 100 + 1e-8) / 100;
  if (!(payment > 0)) return { principal: 0, binding };

  const principal = roundCents(
    principalForMonthlyPayment(payment, stressRate(input.annualRate), input.amortYears, input.compounding),
  );
  return { principal, binding };
}
