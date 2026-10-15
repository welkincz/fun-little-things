function placesOf(step: number): number {
  const text = step.toString().toLowerCase();
  if (text.includes("e-")) return Number(text.slice(text.indexOf("e-") + 2));
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Move by whole slider steps. An off-grid value steps onto the next grid line first. */
export function stepBy(value: number, steps: number, step: number, min: number, max: number): number {
  const places = placesOf(step);
  const origin = (value - min) / step;
  const onGrid = Math.abs(origin - Math.round(origin)) < 1e-6;
  let index: number;
  if (onGrid) index = Math.round(origin) + steps;
  else if (steps > 0) index = Math.ceil(origin - 1e-9) + steps - 1;
  else index = Math.floor(origin + 1e-9) + steps + 1;
  return clamp(roundTo(min + index * step, places), min, max);
}

/** PageUp / PageDown: 10% of the slider span, then snap to the nearest step. */
export function stepPage(value: number, direction: 1 | -1, step: number, min: number, max: number): number {
  const places = placesOf(step);
  const target = value + (max - min) * 0.1 * direction;
  const index = Math.round((target - min) / step);
  return clamp(roundTo(min + index * step, places), min, max);
}
