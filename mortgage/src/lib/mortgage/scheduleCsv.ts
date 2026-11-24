import type { YearRow } from "./schedule";

const COLUMNS: { header: string; value: (row: YearRow) => string }[] = [
  { header: "Year", value: (row) => String(row.year) },
  { header: "Paid", value: (row) => money(row.paid) },
  { header: "Principal", value: (row) => money(row.principal) },
  { header: "Interest", value: (row) => money(row.interest) },
  { header: "Balance", value: (row) => money(row.balance) },
];

function money(value: number): string {
  return value.toFixed(2);
}

/** RFC 4180 quoting. Plain numbers and these headers stay unquoted. */
export function quoteCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Year-by-year rows, in the same columns as the table, with CRLF line endings. */
export function scheduleCsv(rows: YearRow[]): string {
  const lines = [
    COLUMNS.map((column) => quoteCsvField(column.header)).join(","),
    ...rows.map((row) => COLUMNS.map((column) => quoteCsvField(column.value(row))).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}
