import { describe, expect, it } from "vitest";
import { calculate, defaultInput } from "../scenario";
import { quoteCsvField, scheduleCsv } from "../scheduleCsv";
import type { YearRow } from "../schedule";

const HEADER = "Year,Paid,Principal,Interest,Balance";

function records(csv: string): string[] {
  expect(csv.endsWith("\r\n")).toBe(true);
  const lines = csv.slice(0, -2).split("\r\n");
  expect(lines.some((line) => line.includes("\n") || line.includes("\r"))).toBe(false);
  return lines;
}

function cents(value: number): number {
  return Math.round(value * 100);
}

function columnCents(lines: string[], index: number): number {
  return lines.reduce((sum, line) => sum + cents(Number(line.split(",")[index])), 0);
}

describe("schedule csv", () => {
  it("writes the year-by-year columns as plain cents with CRLF", () => {
    const csv = scheduleCsv([
      { year: 1, payments: 12, paid: 1000, principal: 400.5, interest: 599.5, balance: 9600 },
    ]);
    expect(csv).toBe(`${HEADER}\r\n1,1000.00,400.50,599.50,9600.00\r\n`);
  });

  it("quotes a field that contains a comma, quote, or line break", () => {
    expect(quoteCsvField("plain")).toBe("plain");
    expect(quoteCsvField("a,b")).toBe('"a,b"');
    expect(quoteCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(quoteCsvField("a\nb")).toBe('"a\nb"');
    expect(quoteCsvField("a\rb")).toBe('"a\rb"');
  });

  it("matches the $800k, 20% down, 25-year schedule, including a zero ending balance", () => {
    const result = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 160_000,
      amortYears: 25,
      frequency: "monthly",
    });
    const lines = records(scheduleCsv(result.years));
    expect(lines[0]).toBe(HEADER);
    const rows = lines.slice(1);
    expect(rows).toHaveLength(result.years.length);
    expect(rows.at(-1)?.split(",")[4]).toBe("0.00");
    expect(columnCents(rows, 1)).toBe(result.years.reduce((sum, row) => sum + cents(row.paid), 0));
    expect(columnCents(rows, 2)).toBe(result.years.reduce((sum, row) => sum + cents(row.principal), 0));
    expect(columnCents(rows, 3)).toBe(result.years.reduce((sum, row) => sum + cents(row.interest), 0));
    rows.forEach((line, index) => {
      const cells = line.split(",");
      const row: YearRow = result.years[index];
      expect(cells).toEqual([
        String(row.year),
        row.paid.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.balance.toFixed(2),
      ]);
    });
  });

  it("uses the schedule for the current frequency instead of a fixed monthly table", () => {
    const accelerated = calculate({
      ...defaultInput(),
      price: 800_000,
      downPayment: 160_000,
      amortYears: 25,
      frequency: "accel-biweekly",
    });
    const lines = records(scheduleCsv(accelerated.years));
    expect(lines.slice(1)).toHaveLength(accelerated.years.length);
    expect(accelerated.years.length).toBeLessThan(25);
    expect(lines.at(-1)?.split(",")[4]).toBe("0.00");
  });
});
