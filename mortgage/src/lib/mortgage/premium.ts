import { roundCents } from "./money";
import { ONTARIO_PST } from "./rules";

/**
 * CMHC premium as a fraction of the base loan.
 * Low-ratio bands (LTV at or under 80%) exist at CMHC but are not charged here.
 * High-ratio insurance is the default-insurance case buyers are quoted.
 */
export function cmhcPremiumRate(
  ltv: number,
  amortYears: number,
  nonTraditional = false,
): number {
  if (!(ltv > 0.8)) return 0;
  let rate: number;
  if (ltv <= 0.85) rate = 0.028;
  else if (ltv <= 0.9) rate = 0.031;
  else if (ltv <= 0.95) rate = nonTraditional ? 0.045 : 0.04;
  else return Number.NaN;
  if (amortYears > 25) rate += 0.002;
  return rate;
}

export function premiumAmount(baseLoan: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return roundCents(baseLoan * rate);
}

export function pstOnPremium(
  premium: number,
  location: "to" | "on" | "ot",
): number {
  if (location === "ot" || premium <= 0) return 0;
  return roundCents(premium * ONTARIO_PST);
}
