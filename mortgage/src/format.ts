const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const whole = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const grouped = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 });

export function formatCAD(value: number): string {
  if (!Number.isFinite(value)) return "Unavailable";
  return money.format(value);
}

export function formatWhole(value: number): string {
  if (!Number.isFinite(value)) return "Unavailable";
  if (Math.abs(value - Math.round(value)) >= 0.001) return formatCAD(value);
  return whole.format(value);
}

/** Hero and breakdown dollars, cents dropped. */
export function formatDollars(value: number): string {
  if (!Number.isFinite(value)) return "Unavailable";
  return whole.format(value);
}

export function formatGrouped(value: number): string {
  return grouped.format(value);
}

export function formatRate(percent: number): string {
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent);
}

/** Down-payment percent shown in the narrow field. One decimal; dollars stay exact. */
export function formatDownPercent(percent: number): string {
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percent);
}

export function formatRatio(rate: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rate);
}

export function formatPercentPoints(rate: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function formatDelta(value: number): string {
  const abs = formatCAD(Math.abs(value));
  if (value > 0.004) return `+${abs}`;
  if (value < -0.004) return `−${abs}`;
  return formatCAD(0);
}

export function formatYears(years: number): string {
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(years);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
