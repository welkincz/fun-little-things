/** Half-up to the cent. Payments use this. */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = Math.sign(value) || 1;
  const cents = Math.round(Math.abs(value) * 100 + 1e-8);
  return (sign * cents) / 100;
}

/**
 * Truncate a positive balance to the cent.
 * The published FCAC balance ($88,507.50) is the closed-form figure
 * 88507.507… cut at the cent, not rounded half-up ($88,507.51).
 */
export function truncCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value * 100 + 1e-8) / 100;
}

/** Accepts 800000, 800,000, $800,000, 800k, 1.5m. */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return null;
  const match = s.match(/^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?([km])?$/);
  if (!match) return null;
  const num = Number((match[1] + (match[2] ?? "")).replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const mult = match[3] === "k" ? 1_000 : match[3] === "m" ? 1_000_000 : 1;
  return num * mult;
}

export function parsePercent(raw: string): number | null {
  const s = raw.trim().replace(/%/g, "").replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
