import { formatDollars, formatGrouped, formatRate } from "../format";
import { parseAmount, parsePercent } from "../lib/mortgage/money";
import type { CalculatorInput, Scenario } from "../lib/mortgage/scenario";
import { DecimalField, FieldBlock, RangeControl } from "./Fields";

const PRICE_MIN = 100_000;
const PRICE_MAX = 2_000_000;
const PRICE_STEP = 5_000;

function downPercent(price: number, down: number): number {
  if (!(price > 0)) return 0;
  return Math.round((down / price) * 100 * 10_000) / 10_000;
}

function parseYears(raw: string): number | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(years|year|yrs|yr)$/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function Notes({
  input,
  result,
  jumpRef,
  onPrice,
  onDownAmount,
  onDownPercent,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  jumpRef: { current: boolean };
  onPrice: (price: number) => void;
  onDownAmount: (amount: number) => void;
  onDownPercent: (percent: number) => void;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  const percent = downPercent(input.price, input.downPayment);
  const warningId = "down-warning";
  const warning =
    result.blocked === "not-insurable"
      ? "Not insurable at $1.5M+. Need 20% down."
      : result.blocked === "down-min"
        ? `Minimum down is ${formatDollars(result.minimumDown)}.`
        : result.blocked === "down-high"
          ? "Down payment is above the home price."
          : null;
  const priceMaxLabel = formatDollars(input.price);

  return (
    <form className="inputs" aria-label="Mortgage details" onSubmit={(event) => event.preventDefault()}>
      <FieldBlock
        label="Home price"
        htmlFor="price"
        control={
          <DecimalField
            id="price"
            value={input.price}
            format={formatGrouped}
            parse={parseAmount}
            min={PRICE_MIN}
            max={PRICE_MAX}
            minLabel={formatDollars(PRICE_MIN)}
            maxLabel={formatDollars(PRICE_MAX)}
            prefix="$"
            widthClass="money"
            onCommit={(value) => {
              if (value != null) onPrice(value);
            }}
          />
        }
        slider={
          <RangeControl
            label="Home price"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={input.price}
            ariaValueText={formatDollars(input.price)}
            jumpRef={jumpRef}
            onValue={onPrice}
          />
        }
      />

      <FieldBlock
        label="Down payment"
        htmlFor="down"
        control={
          <div className="num-row">
            <DecimalField
              id="down"
              value={input.downPayment}
              format={formatGrouped}
              parse={parseAmount}
              min={0}
              max={Math.max(input.price, 0)}
              minLabel={formatDollars(0)}
              maxLabel={priceMaxLabel}
              prefix="$"
              widthClass="money"
              describedBy={warning ? warningId : undefined}
              invalid={warning != null}
              onCommit={(value) => {
                if (value != null) onDownAmount(value);
              }}
            />
            <DecimalField
              id="down-percent"
              value={percent}
              format={(value) =>
                new Intl.NumberFormat("en-CA", { maximumFractionDigits: 4 }).format(value)
              }
              parse={parsePercent}
              min={0}
              max={100}
              minLabel="0%"
              maxLabel="100%"
              suffix="%"
              widthClass="pct"
              ariaLabel="Down payment percent"
              describedBy={warning ? warningId : undefined}
              invalid={warning != null}
              onCommit={(value) => {
                if (value != null) onDownPercent(value);
              }}
            />
          </div>
        }
        slider={
          <RangeControl
            label="Down payment"
            min={0}
            max={100}
            step={0.5}
            value={percent}
            ariaValueText={formatDollars(input.downPayment)}
            describedBy={warning ? warningId : undefined}
            jumpRef={jumpRef}
            onValue={onDownPercent}
          />
        }
        extra={
          warning ? (
            <p className="warning" id={warningId} role="status" data-testid="down-warning">
              <svg className="warn-icon" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M10 2.5 18 17H2L10 2.5Zm0 5.2a.7.7 0 0 0-.7.7v3.6a.7.7 0 1 0 1.4 0V8.4a.7.7 0 0 0-.7-.7Zm0 7.1a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
                />
              </svg>
              <span>{warning}</span>
            </p>
          ) : null
        }
      />

      <FieldBlock
        label="Interest rate"
        htmlFor="rate"
        control={
          <DecimalField
            id="rate"
            value={input.ratePercent}
            format={formatRate}
            parse={(raw) => {
              const parsed = parsePercent(raw);
              if (parsed == null) return null;
              return Math.round(parsed * 100) / 100;
            }}
            min={0}
            max={10}
            minLabel="0%"
            maxLabel="10%"
            suffix="%"
            widthClass="pct"
            onCommit={(value) => {
              if (value != null) onChange({ ratePercent: value });
            }}
          />
        }
        slider={
          <RangeControl
            label="Interest rate"
            min={0}
            max={10}
            step={0.05}
            value={input.ratePercent}
            ariaValueText={`${formatRate(input.ratePercent)}%`}
            jumpRef={jumpRef}
            onValue={(ratePercent) => onChange({ ratePercent: Math.round(ratePercent * 100) / 100 })}
          />
        }
      />

      <FieldBlock
        label="Amortization"
        htmlFor="amort"
        control={
          <DecimalField
            id="amort"
            value={input.amortYears}
            format={(value) => String(value)}
            parse={parseYears}
            min={5}
            max={30}
            minLabel="5 yrs"
            maxLabel="30 yrs"
            suffix="yrs"
            widthClass="years"
            invalidMessage="Enter whole years."
            onCommit={(value) => {
              if (value != null) onChange({ amortYears: value });
            }}
          />
        }
        slider={
          <RangeControl
            label="Amortization"
            min={5}
            max={30}
            step={1}
            value={input.amortYears}
            ariaValueText={`${input.amortYears} years`}
            jumpRef={jumpRef}
            onValue={(amortYears) => onChange({ amortYears })}
          />
        }
      />
    </form>
  );
}
