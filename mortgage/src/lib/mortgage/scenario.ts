import { isHighRatio, isNotInsurable, loanToValue, minDownPayment } from "./down";
import { ontarioLtt, ontarioRebate, torontoMltt, torontoRebate } from "./ltt";
import { roundCents } from "./money";
import {
  balanceAfterPayments,
  frequencyMeta,
  monthlyEquivalent,
  mortgagePayment,
  periodsUntilPayoff,
  type Compounding,
  type FrequencyId,
} from "./payment";
import { cmhcPremiumRate, premiumAmount, pstOnPremium } from "./premium";
import { qualify, stressRate, type QualifyResult } from "./qualify";
import { renewalRows, type RenewalQuote } from "./renewal";
import { INSURED_PRICE_CAP, UNINSURED_AMORT_MAX } from "./rules";
import { termTotals, yearlySchedule, type YearRow } from "./schedule";

export type LocationId = "to" | "on" | "ot";
export type PropertyKind = "sfr" | "other";

export type CalculatorInput = {
  price: number;
  location: LocationId;
  property: PropertyKind;
  newBuild: boolean;
  firstTime: boolean;
  citizen: boolean;
  downPayment: number;
  ratePercent: number;
  rateType: "fixed" | "variable";
  variableCompounding: Compounding;
  termYears: number;
  amortYears: number;
  frequency: FrequencyId;
  payPremiumInCash: boolean;
  income: number | null;
  propertyTax: number | null;
  taxPeriod: "month" | "year";
  heat: number | null;
  condo: number | null;
  debts: number | null;
  revolving: number | null;
  otherClosing: number | null;
  renewalCustomPercent: number | null;
};

export type BlockCode = "price" | "down-min" | "down-high" | "not-insurable";

export type Scenario = {
  blocked: BlockCode | null;
  minimumDown: number;
  ltv: number | null;
  premiumRate: number;
  premium: number;
  pst: number;
  baseLoan: number;
  loan: number;
  payment: number | null;
  monthlyEquivalent: number | null;
  standardMonthly: number | null;
  frequencyLabel: string;
  amortRequested: number;
  amortUsed: number;
  amortCapped: boolean;
  uninsuredAmortAssumption: boolean;
  insuredLongReason: "first-time" | "new-build" | "both" | null;
  stress: number | null;
  qualifyingPayment: number | null;
  qualify: QualifyResult | null;
  endBalance: number | null;
  termPrincipal: number | null;
  termInterest: number | null;
  payoffYears: number | null;
  yearsLeft: number | null;
  ontarioTax: number;
  ontarioRebate: number;
  torontoTax: number;
  torontoRebate: number;
  otherClosing: number;
  cashToClose: number | null;
  renewal: RenewalQuote[] | null;
  years: YearRow[];
  chart: { year: number; balance: number }[];
  rebateEligible: boolean;
  compounding: Compounding;
};

export function defaultInput(): CalculatorInput {
  const price = 800_000;
  return {
    price,
    location: "to",
    property: "sfr",
    newBuild: false,
    firstTime: true,
    citizen: true,
    downPayment: minDownPayment(price),
    ratePercent: 4.5,
    rateType: "fixed",
    variableCompounding: "monthly",
    termYears: 5,
    amortYears: 25,
    frequency: "monthly",
    payPremiumInCash: false,
    income: null,
    propertyTax: null,
    taxPeriod: "year",
    heat: null,
    condo: null,
    debts: null,
    revolving: null,
    otherClosing: null,
    renewalCustomPercent: null,
  };
}

function empty(blocked: BlockCode, minimumDown: number): Scenario {
  return {
    blocked,
    minimumDown,
    ltv: null,
    premiumRate: 0,
    premium: 0,
    pst: 0,
    baseLoan: 0,
    loan: 0,
    payment: null,
    monthlyEquivalent: null,
    standardMonthly: null,
    frequencyLabel: "",
    amortRequested: 0,
    amortUsed: 0,
    amortCapped: false,
    uninsuredAmortAssumption: false,
    insuredLongReason: null,
    stress: null,
    qualifyingPayment: null,
    qualify: null,
    endBalance: null,
    termPrincipal: null,
    termInterest: null,
    payoffYears: null,
    yearsLeft: null,
    ontarioTax: 0,
    ontarioRebate: 0,
    torontoTax: 0,
    torontoRebate: 0,
    otherClosing: 0,
    cashToClose: null,
    renewal: null,
    years: [],
    chart: [],
    rebateEligible: false,
    compounding: "semi",
  };
}

export function legalAmortYears(input: {
  price: number;
  downPayment: number;
  amortYears: number;
  firstTime: boolean;
  newBuild: boolean;
}): { used: number; capped: boolean; assumption: boolean; reason: Scenario["insuredLongReason"] } {
  const highRatio = isHighRatio(input.price, input.downPayment) && input.price < INSURED_PRICE_CAP;
  let max = UNINSURED_AMORT_MAX;
  let assumption = !highRatio;
  let reason: Scenario["insuredLongReason"] = null;
  if (highRatio) {
    assumption = false;
    if (input.firstTime || input.newBuild) {
      max = 30;
      reason =
        input.firstTime && input.newBuild ? "both" : input.firstTime ? "first-time" : "new-build";
    } else {
      max = 25;
      reason = null;
    }
  }
  const requested = Math.max(1, input.amortYears);
  const used = Math.min(requested, max);
  return { used, capped: requested > max, assumption, reason: used > 25 ? reason : null };
}

export function calculate(input: CalculatorInput): Scenario {
  const minimumDown = minDownPayment(input.price);
  if (!(input.price > 0)) return empty("price", minimumDown);
  if (input.downPayment > input.price + 0.001) return empty("down-high", minimumDown);
  if (isNotInsurable(input.price, input.downPayment) || (input.price >= INSURED_PRICE_CAP && roundCents(input.downPayment) < minimumDown)) {
    return empty("not-insurable", minimumDown);
  }
  if (roundCents(input.downPayment) < minimumDown - 0.001) return empty("down-min", minimumDown);

  const singleFamily = input.property === "sfr";
  const inOntario = input.location === "to" || input.location === "on";
  const inToronto = input.location === "to";
  const rebateEligible = input.firstTime && input.citizen;
  const ontarioTax = inOntario ? ontarioLtt(input.price, singleFamily) : 0;
  const torontoTax = inToronto ? torontoMltt(input.price, singleFamily) : 0;
  const ontRebate = ontarioRebate(ontarioTax, rebateEligible);
  const torRebate = torontoRebate(torontoTax, rebateEligible);

  const ltv = loanToValue(input.price, input.downPayment);
  const amort = legalAmortYears(input);
  const highRatioInsured = ltv > 0.8 + 1e-10 && input.price < INSURED_PRICE_CAP;
  const rate = highRatioInsured ? cmhcPremiumRate(ltv, amort.used, false) : 0;
  const baseLoan = roundCents(input.price - input.downPayment);
  const premium = premiumAmount(baseLoan, rate);
  const pst = pstOnPremium(premium, input.location);
  const loan = input.payPremiumInCash ? baseLoan : roundCents(baseLoan + premium);
  const otherClosing = input.otherClosing ?? 0;
  const cashToClose = roundCents(
    input.downPayment +
      pst +
      (ontarioTax - ontRebate) +
      (torontoTax - torRebate) +
      otherClosing +
      (input.payPremiumInCash ? premium : 0),
  );

  const annual = input.ratePercent / 100;
  const compounding: Compounding =
    input.rateType === "variable" ? input.variableCompounding : "semi";
  const quote = mortgagePayment(loan, annual, amort.used, input.frequency, compounding);
  const monthlyQuote = mortgagePayment(loan, annual, amort.used, "monthly", compounding);
  const payoffPeriods = periodsUntilPayoff(
    loan,
    quote.periodicRate,
    quote.raw,
    quote.contractPeriods,
  );
  const payoffYears = payoffPeriods / quote.perYear;
  const term = termTotals(loan, quote, input.termYears, payoffPeriods);
  const years = yearlySchedule(loan, quote, payoffPeriods);
  const chart = [{ year: 0, balance: loan }, ...years.map((row) => ({ year: row.year, balance: row.balance }))];

  const stress = stressRate(annual);
  const qualifying = mortgagePayment(loan, stress, amort.used, "monthly", compounding);
  const qualifyResult = qualify({
    qualifyingPayment: qualifying.rounded,
    incomeAnnual: input.income,
    propertyTax: input.propertyTax,
    taxPeriod: input.taxPeriod,
    heatMonthly: input.heat,
    condoMonthly: input.condo,
    otherDebtsMonthly: input.debts,
    revolvingBalance: input.revolving,
  });

  const paidOffDuringTerm = term.balance === 0;
  const yearsLeft = paidOffDuringTerm ? 0 : (payoffPeriods - term.periods) / quote.perYear;
  const renewal = paidOffDuringTerm
    ? null
    : renewalRows({
        balance: term.balance,
        contractRate: annual,
        yearsLeft,
        frequency: input.frequency,
        compounding,
        currentMonthly: monthlyEquivalent(quote.rounded, input.frequency),
        customPercent: input.renewalCustomPercent,
      });

  return {
    blocked: null,
    minimumDown,
    ltv,
    premiumRate: rate,
    premium,
    pst,
    baseLoan,
    loan,
    payment: quote.rounded,
    monthlyEquivalent: roundCents(monthlyEquivalent(quote.rounded, input.frequency)),
    standardMonthly: monthlyQuote.rounded,
    frequencyLabel: frequencyMeta(input.frequency).label,
    amortRequested: input.amortYears,
    amortUsed: amort.used,
    amortCapped: amort.capped,
    uninsuredAmortAssumption: amort.assumption,
    insuredLongReason: amort.reason,
    stress,
    qualifyingPayment: qualifying.rounded,
    qualify: qualifyResult,
    endBalance: term.balance,
    termPrincipal: term.principal,
    termInterest: term.interest,
    payoffYears,
    yearsLeft: paidOffDuringTerm ? null : yearsLeft,
    ontarioTax,
    ontarioRebate: ontRebate,
    torontoTax,
    torontoRebate: torRebate,
    otherClosing,
    cashToClose,
    renewal,
    years,
    chart,
    rebateEligible,
    compounding,
  };
}

export function exampleBalanceCheck(principal: number, annual: number, years: number, periods: number) {
  const quote = mortgagePayment(principal, annual, years, "monthly", "semi");
  return balanceAfterPayments(principal, quote.periodicRate, quote.raw, periods);
}
