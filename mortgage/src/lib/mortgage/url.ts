import { minDownPayment } from "./down";
import { parseAmount } from "./money";
import { frequencyByCode, frequencyMeta, type FrequencyId } from "./payment";
import {
  defaultInput,
  type CalculatorInput,
  type LocationId,
  type PropertyKind,
} from "./scenario";

const KNOWN = new Set([
  "p",
  "loc",
  "pt",
  "ftb",
  "nb",
  "cit",
  "d",
  "r",
  "rt",
  "vc",
  "am",
  "tm",
  "fq",
  "pc",
  "inc",
  "tax",
  "taxu",
  "heat",
  "cf",
  "debt",
  "rev",
  "occ",
  "rr",
]);

function flag(value: string | null, fallback: boolean, invalid: { current: boolean }): boolean {
  if (value == null || value === "") return fallback;
  if (value === "1") return true;
  if (value === "0") return false;
  invalid.current = true;
  return fallback;
}

function moneyParam(value: string | null, invalid: { current: boolean }): number | null {
  if (value == null || value === "") return null;
  const n = parseAmount(value);
  if (n == null || n < 0) {
    invalid.current = true;
    return null;
  }
  return n;
}

export function serialize(input: CalculatorInput): string {
  const params = new URLSearchParams();
  params.set("p", String(input.price));
  params.set("loc", input.location);
  params.set("pt", input.property === "sfr" ? "sfr" : "oth");
  params.set("ftb", input.firstTime ? "1" : "0");
  params.set("nb", input.newBuild ? "1" : "0");
  params.set("cit", input.citizen ? "1" : "0");
  params.set("d", String(input.downPayment));
  params.set("r", String(input.ratePercent));
  params.set("rt", input.rateType === "fixed" ? "f" : "v");
  params.set("vc", input.variableCompounding === "monthly" ? "m" : "s");
  params.set("am", String(input.amortYears));
  params.set("tm", String(input.termYears));
  params.set("fq", frequencyMeta(input.frequency).code);
  params.set("pc", input.payPremiumInCash ? "1" : "0");
  if (input.income != null) params.set("inc", String(input.income));
  if (input.propertyTax != null) params.set("tax", String(input.propertyTax));
  if (input.propertyTax != null) params.set("taxu", input.taxPeriod === "year" ? "yr" : "mo");
  if (input.heat != null) params.set("heat", String(input.heat));
  if (input.condo != null) params.set("cf", String(input.condo));
  if (input.debts != null) params.set("debt", String(input.debts));
  if (input.revolving != null) params.set("rev", String(input.revolving));
  if (input.otherClosing != null) params.set("occ", String(input.otherClosing));
  if (input.renewalCustomPercent != null) params.set("rr", String(input.renewalCustomPercent));
  return `?${params.toString()}`;
}

export function parseSearch(search: string): { input: CalculatorInput; invalid: boolean } {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const invalid = { current: false };
  for (const key of params.keys()) {
    if (!KNOWN.has(key)) invalid.current = true;
  }

  const input = defaultInput();
  const price = moneyParam(params.get("p"), invalid);
  if (params.has("p")) {
    if (price != null && price > 0) input.price = price;
    else invalid.current = true;
  }

  const loc = params.get("loc");
  if (loc != null) {
    if (loc === "to" || loc === "on" || loc === "ot") input.location = loc as LocationId;
    else invalid.current = true;
  }

  const pt = params.get("pt");
  if (pt != null) {
    if (pt === "sfr" || pt === "oth") input.property = (pt === "sfr" ? "sfr" : "other") as PropertyKind;
    else invalid.current = true;
  }

  if (params.has("ftb")) input.firstTime = flag(params.get("ftb"), input.firstTime, invalid);
  if (params.has("nb")) input.newBuild = flag(params.get("nb"), input.newBuild, invalid);
  if (params.has("cit")) input.citizen = flag(params.get("cit"), input.citizen, invalid);
  if (params.has("pc")) input.payPremiumInCash = flag(params.get("pc"), input.payPremiumInCash, invalid);

  if (params.has("d")) {
    const down = moneyParam(params.get("d"), invalid);
    input.downPayment = down == null ? minDownPayment(input.price) : down;
    if (down == null) invalid.current = true;
  } else if (params.has("p")) {
    input.downPayment = minDownPayment(input.price);
  }

  if (params.has("r")) {
    const rate = moneyParam(params.get("r"), invalid);
    if (rate == null || rate > 30) invalid.current = true;
    else input.ratePercent = rate;
  }

  const rt = params.get("rt");
  if (rt != null) {
    if (rt === "f" || rt === "v") input.rateType = rt === "f" ? "fixed" : "variable";
    else invalid.current = true;
  }

  const vc = params.get("vc");
  if (vc != null) {
    if (vc === "m" || vc === "s") input.variableCompounding = vc === "m" ? "monthly" : "semi";
    else invalid.current = true;
  }

  if (params.has("am")) {
    const years = Number(params.get("am"));
    if (!Number.isInteger(years) || years < 1 || years > 40) invalid.current = true;
    else input.amortYears = Math.min(years, 30);
  }

  if (params.has("tm")) {
    const years = Number(params.get("tm"));
    if (!Number.isInteger(years) || years < 1 || years > 10) invalid.current = true;
    else input.termYears = years;
  }

  const fq = params.get("fq");
  if (fq != null) {
    const id = frequencyByCode(fq);
    if (!id) invalid.current = true;
    else input.frequency = id as FrequencyId;
  }

  const optional = [
    ["inc", "income"],
    ["tax", "propertyTax"],
    ["heat", "heat"],
    ["cf", "condo"],
    ["debt", "debts"],
    ["rev", "revolving"],
    ["occ", "otherClosing"],
    ["rr", "renewalCustomPercent"],
  ] as const;
  for (const [key, field] of optional) {
    if (!params.has(key)) continue;
    const n = moneyParam(params.get(key), invalid);
    if (n == null) invalid.current = true;
    else input[field] = n;
  }

  const taxu = params.get("taxu");
  if (taxu != null) {
    if (taxu === "yr" || taxu === "mo") input.taxPeriod = taxu === "yr" ? "year" : "month";
    else invalid.current = true;
  }

  return { input, invalid: invalid.current };
}
