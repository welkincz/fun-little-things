import { roundCents } from "./money";
import { ONTARIO_REBATE_CAP, TORONTO_REBATE_CAP } from "./rules";

type Band = { upTo: number; rate: number };

function graduated(value: number, bands: Band[]): number {
  if (!(value > 0)) return 0;
  let tax = 0;
  let prev = 0;
  for (const band of bands) {
    const slice = Math.min(value, band.upTo) - prev;
    if (slice > 0) tax += slice * band.rate;
    prev = band.upTo;
    if (value <= band.upTo) break;
  }
  return roundCents(tax);
}

const ONTARIO_BASE: Band[] = [
  { upTo: 55_000, rate: 0.005 },
  { upTo: 250_000, rate: 0.01 },
  { upTo: 400_000, rate: 0.015 },
];

/** R18. The 2.5% bracket applies only to one or two single-family residences. */
export function ontarioLtt(value: number, singleFamily: boolean): number {
  const bands: Band[] = singleFamily
    ? [
        ...ONTARIO_BASE,
        { upTo: 2_000_000, rate: 0.02 },
        { upTo: Number.POSITIVE_INFINITY, rate: 0.025 },
      ]
    : [...ONTARIO_BASE, { upTo: Number.POSITIVE_INFINITY, rate: 0.02 }];
  return graduated(value, bands);
}

/** R20 and R21. */
export function torontoMltt(value: number, singleFamily: boolean): number {
  const bands: Band[] = singleFamily
    ? [
        ...ONTARIO_BASE,
        { upTo: 2_000_000, rate: 0.02 },
        { upTo: 3_000_000, rate: 0.025 },
        { upTo: 4_000_000, rate: 0.044 },
        { upTo: 5_000_000, rate: 0.0545 },
        { upTo: 10_000_000, rate: 0.065 },
        { upTo: 20_000_000, rate: 0.0755 },
        { upTo: Number.POSITIVE_INFINITY, rate: 0.086 },
      ]
    : [...ONTARIO_BASE, { upTo: Number.POSITIVE_INFINITY, rate: 0.02 }];
  return graduated(value, bands);
}

export function firstTimeRebate(
  tax: number,
  eligible: boolean,
  cap: number,
): number {
  if (!eligible || tax <= 0) return 0;
  return roundCents(Math.min(tax, cap));
}

export function ontarioRebate(tax: number, eligible: boolean): number {
  return firstTimeRebate(tax, eligible, ONTARIO_REBATE_CAP);
}

export function torontoRebate(tax: number, eligible: boolean): number {
  return firstTimeRebate(tax, eligible, TORONTO_REBATE_CAP);
}
