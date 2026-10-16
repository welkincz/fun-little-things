import { describe, expect, it } from "vitest";
import { clearMeasurementSpan } from "../../../components/BalanceChart";
import { formatDownPercent } from "../../../format";
import { roundCents } from "../money";
import { calculate, defaultInput } from "../scenario";

function cents(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) throw new Error(`not a number: ${value}`);
  return Math.round(value * 100);
}

describe("down payment percent display", () => {
  it("shows one decimal while the dollar amount stays exact", () => {
    const price = 800_000;
    const down = roundCents((price * 6.875) / 100);
    expect(down).toBe(55_000);
    expect(formatDownPercent((down / price) * 100)).toBe("6.9");
    expect(formatDownPercent(20)).toBe("20.0");
    expect(formatDownPercent(6.5)).toBe("6.5");
    // Typing the rounded display is a different amount than the stored percent.
    expect(roundCents((price * 6.9) / 100)).toBe(55_200);
  });
});

describe("regression payments", () => {
  it("keeps the $800k monthly examples", () => {
    const twenty = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 160_000,
      ratePercent: 4.5,
      amortYears: 25,
      frequency: "monthly",
    });
    expect(cents(twenty.payment)).toBe(354223);

    const minimum = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 55_000,
      ratePercent: 4.5,
      amortYears: 25,
      frequency: "monthly",
    });
    expect(cents(minimum.payment)).toBe(428831);
  });
});

describe("recharts measurement span", () => {
  it("clears the leaked $0 tick label", () => {
    const span = { textContent: "$0", style: { visibility: "visible" } };
    const doc = {
      getElementById(id: string) {
        return id === "recharts_measurement_span" ? span : null;
      },
    };
    clearMeasurementSpan(doc);
    expect(span.textContent).toBe("");
    expect(span.style.visibility).toBe("hidden");
    expect(doc.getElementById("missing")).toBeNull();
  });
});
