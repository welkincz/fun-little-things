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

export function qualify(input: QualifyInput): QualifyResult {
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

  const housingMonthly = input.qualifyingPayment + tax + heat + 0.5 * condo;
  const debtMonthly = housingMonthly + debts + REVOLVING_FACTOR * revolving;

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
