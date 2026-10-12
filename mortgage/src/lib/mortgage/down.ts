import { roundCents } from "./money";
import { INSURED_PRICE_CAP } from "./rules";

/** R4. Rounded half-up to the cent. */
export function minDownPayment(price: number): number {
  if (!(price > 0)) return 0;
  let raw: number;
  if (price <= 500_000) raw = price * 0.05;
  else if (price < INSURED_PRICE_CAP) raw = 25_000 + (price - 500_000) * 0.1;
  else raw = price * 0.2;
  return roundCents(raw);
}

export function loanToValue(price: number, down: number): number {
  if (!(price > 0)) return 0;
  return (price - down) / price;
}

export function isHighRatio(price: number, down: number): boolean {
  return loanToValue(price, down) > 0.8 + 1e-10;
}

/** High-ratio insurance is only offered under $1,500,000. */
export function isInsurable(price: number, down: number): boolean {
  return price < INSURED_PRICE_CAP && isHighRatio(price, down);
}

export function isNotInsurable(price: number, down: number): boolean {
  return price >= INSURED_PRICE_CAP && down < price * 0.2 - 0.001;
}
