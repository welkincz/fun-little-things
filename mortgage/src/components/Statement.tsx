import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  formatCAD,
  formatDelta,
  formatDollars,
  formatPercentPoints,
  formatRate,
  formatRatio,
  formatWhole,
  formatYears,
} from "../format";
import {
  accelerationVersusMonthly,
  formatAccelerationSavings,
  monthlyComparisonSeries,
} from "../lib/mortgage/acceleration";
import {
  formatPrepayOrInvest,
  formatYearlyLumpSum,
  prepayOrInvest,
  yearlyLumpSum,
  type PrepayOrInvest,
} from "../lib/mortgage/lump";
import { compareRates } from "../lib/mortgage/compare";
import { loanToValue, minDownPayment } from "../lib/mortgage/down";
import { mortgagePayment, type FrequencyId } from "../lib/mortgage/payment";
import { formatPaymentTopUp, paymentTopUp } from "../lib/mortgage/topup";
import { breakPenalty, type BreakPenalty } from "../lib/mortgage/penalty";
import { triggerRate, triggerRateSentence } from "../lib/mortgage/trigger";
import { maxQualifyingPrincipal } from "../lib/mortgage/qualify";
import { INSURED_PRICE_CAP, ruleList, RULES_CHECKED } from "../lib/mortgage/rules";
import type { CalculatorInput, Scenario } from "../lib/mortgage/scenario";
import { scheduleCsv } from "../lib/mortgage/scheduleCsv";
import { AnimatedMoney } from "./AnimatedMoney";
import { AmountField, CheckField, ChoiceGroup, DecimalField, RateField, Segmented } from "./Fields";

const loadBalanceChart = () => import("./BalanceChart").then((mod) => ({ default: mod.BalanceChart }));

let balanceChartLoad: ReturnType<typeof loadBalanceChart> | undefined;

/** Start the chart chunk before the details panel mounts. */
export function prefetchBalanceChart(): void {
  balanceChartLoad ??= loadBalanceChart();
}

const BalanceChart = lazy(() => (balanceChartLoad ??= loadBalanceChart()));

const FREQUENCIES: { id: FrequencyId; label: string; title?: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "biweekly", label: "Bi-weekly" },
  { id: "accel-biweekly", label: "Accel.", title: "Accelerated bi-weekly" },
  { id: "weekly", label: "Weekly" },
];

const EXTRA_FREQUENCY: Partial<Record<FrequencyId, { label: string; title: string }>> = {
  semimonthly: { label: "Semi-monthly", title: "Semi-monthly" },
  "accel-weekly": { label: "Accel. wk", title: "Accelerated weekly" },
};

const locations = [
  { id: "to" as const, label: "Toronto" },
  { id: "on" as const, label: "Ontario, outside Toronto" },
  { id: "ot" as const, label: "Another province" },
];

const properties = [
  { id: "sfr" as const, label: "1–2 single-family residences" },
  { id: "other" as const, label: "Other property" },
];

const rateTypes = [
  { id: "fixed" as const, label: "Fixed" },
  { id: "variable" as const, label: "Variable" },
];

const compounds = [
  { id: "monthly" as const, label: "Monthly" },
  { id: "semi" as const, label: "Semi-annual" },
];

const taxPeriods = [
  { id: "year" as const, label: "Per year" },
  { id: "month" as const, label: "Per month" },
];

export function frequencyAffix(id: FrequencyId): { hero: string; dock: string } {
  if (id === "monthly") return { hero: "/month", dock: "/mo" };
  if (id === "weekly" || id === "accel-weekly") return { hero: "/week", dock: "/wk" };
  if (id === "semimonthly") return { hero: "/semi-month", dock: "/sm" };
  return { hero: "/2 weeks", dock: "/2wk" };
}

function breakdownLine(result: Scenario): string | null {
  if (result.blocked || result.payment == null) return null;
  const amount = formatDollars(result.baseLoan);
  if (result.premium > 0) {
    return `Principal + interest on ${amount} · incl. ${formatDollars(result.premium)} CMHC`;
  }
  return `Principal + interest on ${amount}`;
}

function amortNote(result: Scenario): string | null {
  if (result.blocked) return null;
  if (result.amortCapped) {
    return "A 30-year insured mortgage is only available for a first-time buyer or a new build. This estimate uses 25 years.";
  }
  if (result.uninsuredAmortAssumption && result.amortUsed > 25) {
    return "Past 25 years, an uninsured amortization is the lender’s choice. 30 years is an assumption.";
  }
  if (result.insuredLongReason === "both") {
    return "30 years is available because you are a first-time buyer and the home is a new build.";
  }
  if (result.insuredLongReason === "first-time") {
    return "30 years is available because you are a first-time buyer.";
  }
  if (result.insuredLongReason === "new-build") {
    return "30 years is available because the home is a new build.";
  }
  return null;
}

function accelerationLine(input: CalculatorInput, result: Scenario): string | null {
  if (result.blocked || result.payment == null || !(result.loan > 0)) return null;
  const savings = accelerationVersusMonthly({
    loan: result.loan,
    annualRate: input.ratePercent / 100,
    amortYears: result.amortUsed,
    frequency: input.frequency,
    compounding: result.compounding,
  });
  return savings ? formatAccelerationSavings(savings) : null;
}

function lumpLine(input: CalculatorInput, result: Scenario): string | null {
  if (result.blocked || result.payment == null || !(result.loan > 0) || !(input.lumpSum > 0)) return null;
  const savings = yearlyLumpSum({
    loan: result.loan,
    annualRate: input.ratePercent / 100,
    amortYears: result.amortUsed,
    frequency: input.frequency,
    compounding: result.compounding,
    lumpSum: input.lumpSum,
  });
  return savings ? formatYearlyLumpSum(savings) : null;
}

function topUpLine(input: CalculatorInput, result: Scenario): string | null {
  if (result.blocked || result.payment == null || !(result.loan > 0) || input.topUp == null || !(input.topUp > 0)) {
    return null;
  }
  const quote = mortgagePayment(
    result.loan,
    input.ratePercent / 100,
    result.amortUsed,
    input.frequency,
    result.compounding,
  );
  const savings = paymentTopUp({ loan: result.loan, quote, extra: input.topUp });
  return savings ? formatPaymentTopUp(savings) : null;
}

function SoonerLine({ text }: { text: string }) {
  const dot = text.indexOf(" · ");
  const lead = dot === -1 ? text : `${text.slice(0, dot)} ·`;
  const rest = dot === -1 ? null : text.slice(dot + 3);
  return (
    <p className="sooner" data-testid="accel-savings">
      <span>{lead}</span>
      {rest ? (
        <>
          {" "}
          <span>{rest}</span>
        </>
      ) : null}
    </p>
  );
}

export function ResultHero({
  input,
  result,
  jumpRef,
  onFrequency,
}: {
  input: CalculatorInput;
  result: Scenario;
  jumpRef: { current: boolean };
  onFrequency: (frequency: FrequencyId) => void;
}) {
  const affix = frequencyAffix(input.frequency);
  const line = breakdownLine(result);
  const sooner = accelerationLine(input, result);
  const spoken =
    result.payment == null
      ? "Payment unavailable"
      : sooner
        ? `${formatCAD(result.payment)} ${affix.hero}. ${sooner}`
        : `${formatCAD(result.payment)} ${affix.hero}`;
  const [live, setLive] = useState(spoken);
  const extra = EXTRA_FREQUENCY[input.frequency];
  const options = FREQUENCIES.some((item) => item.id === input.frequency)
    ? FREQUENCIES
    : [
        ...FREQUENCIES,
        {
          id: input.frequency,
          label: extra?.label ?? input.frequency,
          title: extra?.title,
        },
      ];

  useEffect(() => {
    const id = window.setTimeout(() => setLive(spoken), 200);
    return () => window.clearTimeout(id);
  }, [spoken]);

  return (
    <section className="result" id="results" tabIndex={-1} aria-label="Payment">
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      <p className="pay-row">
        <span className="pay-figure" data-testid="payment" aria-hidden="true">
          {result.payment == null ? (
            "—"
          ) : (
            <AnimatedMoney value={result.payment} whole jumpRef={jumpRef} />
          )}
        </span>
        {result.payment != null ? (
          <span className="pay-suffix" aria-hidden="true">
            {affix.hero}
          </span>
        ) : null}
      </p>
      {line ? (
        <p className="breakdown" data-testid="breakdown">
          {line}
        </p>
      ) : null}
      {sooner ? <SoonerLine text={sooner} /> : null}
      <Segmented
        label="Payment frequency"
        name="frequency"
        value={input.frequency}
        options={options}
        onChange={onFrequency}
      />
    </section>
  );
}

export function ScenarioDetails({
  input,
  result,
  copied,
  onChange,
  onCopy,
}: {
  input: CalculatorInput;
  result: Scenario;
  copied: boolean;
  onChange: (patch: Partial<CalculatorInput>) => void;
  onCopy: () => void;
}) {
  const sooner = lumpLine(input, result);
  const topped = topUpLine(input, result);
  return (
    <div className="details" id="scenario-details">
      <AmountField
        id="lump-sum"
        label="Yearly lump sum"
        value={input.lumpSum}
        onValue={(lumpSum) => onChange({ lumpSum: lumpSum ?? 0 })}
      />
      <p className="breakdown">Most mortgages limit yearly prepayments. Check your lender's limit.</p>
      {sooner ? (
        <p className="sooner" data-testid="lump-savings">
          {sooner}
        </p>
      ) : null}
      <AmountField
        id="payment-top-up"
        label="Add to each payment"
        value={input.topUp}
        optional
        onValue={(topUp) => onChange({ topUp })}
      />
      <p className="breakdown">Check your lender's prepayment privilege limit.</p>
      {topped ? (
        <p className="sooner" data-testid="topup-savings">
          {topped}
        </p>
      ) : null}
      <InvestCompare input={input} result={result} onChange={onChange} />
      <Insurance input={input} result={result} onChange={onChange} />
      <LandTransfer input={input} result={result} onChange={onChange} />
      <CashToClose input={input} result={result} onChange={onChange} />
      <QualifySection input={input} result={result} onChange={onChange} />
      <Renewal input={input} result={result} onChange={onChange} />
      <CompareAnotherRate input={input} result={result} onChange={onChange} />
      <BreakEarly input={input} result={result} onChange={onChange} />
      <TriggerRate input={input} result={result} />
      <Breakdown input={input} result={result} />
      <YearByYear result={result} />
      <How input={input} result={result} onChange={onChange} />
      <details className="accordion">
        <summary>Share this scenario</summary>
        <div className="accordion-body">
          <button type="button" className="share" data-testid="copy-link" onClick={onCopy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </details>
    </div>
  );
}

function withheld(result: Scenario): boolean {
  return result.blocked != null || result.payment == null;
}

function investComparison(input: CalculatorInput, result: Scenario): PrepayOrInvest | null {
  if (result.blocked || result.payment == null || !(result.loan > 0) || !(input.lumpSum > 0)) return null;
  if (input.investReturnPercent == null) return null;
  if (input.investAccount === "taxable" && input.marginalTaxPercent == null) return null;
  return prepayOrInvest({
    loan: result.loan,
    annualRate: input.ratePercent / 100,
    amortYears: result.amortUsed,
    frequency: input.frequency,
    compounding: result.compounding,
    lumpSum: input.lumpSum,
    annualReturn: input.investReturnPercent / 100,
    marginalTax: (input.marginalTaxPercent ?? 0) / 100,
    account: input.investAccount,
  });
}

function InvestCompare({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  if (!(input.lumpSum > 0)) return null;
  const comparison = investComparison(input, result);
  return (
    <div className="compare" data-testid="invest-compare">
      <p className="compare-label">Or invest it instead</p>
      <Segmented
        label="Account"
        name="invest-account"
        value={input.investAccount}
        options={[
          { id: "tfsa", label: "TFSA" },
          { id: "taxable", label: "Non-registered" },
        ]}
        onChange={(investAccount) => onChange({ investAccount })}
      />
      <RateField
        id="invest-return"
        label="Expected annual return"
        value={input.investReturnPercent}
        optional
        max={100}
        onValue={(investReturnPercent) => onChange({ investReturnPercent })}
      />
      <RateField
        id="marginal-tax"
        label="Marginal tax rate"
        value={input.marginalTaxPercent}
        optional
        max={100}
        onValue={(marginalTaxPercent) => onChange({ marginalTaxPercent })}
      />
      <p className="breakdown">
        TFSA growth is tax-free. Non-registered growth is taxed at your marginal rate each year.
      </p>
      {comparison ? (
        <>
          <p className="breakdown">
            After the earlier payoff, the regular payments are invested at the same return until the original payoff
            date.
          </p>
          <p className="verdict" data-testid="invest-verdict">
            {formatPrepayOrInvest(comparison)}
          </p>
          <ul className="stats">
            <li>
              <span>Prepay</span>
              <strong data-testid="prepay-total">{formatDollars(comparison.prepay)}</strong>
            </li>
            <li>
              <span>Invest</span>
              <strong data-testid="invest-total">{formatDollars(comparison.invest)}</strong>
            </li>
          </ul>
          {comparison.breakEvenReturn != null ? (
            <p className="breakdown" data-testid="break-even">
              Break-even return is {formatRate(comparison.breakEvenReturn * 100)}%.
            </p>
          ) : null}
        </>
      ) : null}
      <p className="breakdown">Information, not financial advice.</p>
    </div>
  );
}

function Insurance({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  let why = "No CMHC premium. The down payment is at least 20%.";
  if (result.blocked === "not-insurable") {
    why = "At $1,500,000 and above, less than 20% down cannot be insured.";
  } else if (result.blocked) {
    why = "The premium is calculated once the down payment is allowed.";
  } else if (result.premium > 0) {
    why = input.payPremiumInCash
      ? "The down payment is under 20%, so this premium is paid in cash. Provincial sales tax on the premium is always cash."
      : "The down payment is under 20%, so this premium is added to the mortgage. Provincial sales tax on the premium is paid in cash.";
  }
  return (
    <details className="accordion">
      <summary>Mortgage insurance (CMHC)</summary>
      <div className="accordion-body">
        <p>{why}</p>
        {result.premium > 0 ? (
          <ul className="stats">
            <li>
              <span>Premium rate</span>
              <strong>{formatPercentPoints(result.premiumRate)}</strong>
            </li>
            <li>
              <span>Premium</span>
              <strong>{formatCAD(result.premium)}</strong>
            </li>
            {result.pst > 0 ? (
              <li>
                <span>Sales tax on the premium</span>
                <strong>{formatCAD(result.pst)}</strong>
              </li>
            ) : null}
          </ul>
        ) : null}
        <CheckField
          id="premium-cash"
          label="Pay the insurance premium in cash at closing"
          checked={input.payPremiumInCash}
          onChange={(payPremiumInCash) => onChange({ payPremiumInCash })}
        />
        <CheckField
          id="new-build"
          label="New build"
          checked={input.newBuild}
          onChange={(newBuild) => onChange({ newBuild })}
        />
      </div>
    </details>
  );
}

function LandTransfer({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  return (
    <details className="accordion">
      <summary>Land transfer tax</summary>
      <div className="accordion-body">
        <ChoiceGroup
          legend="Where"
          name="location"
          value={input.location}
          options={locations}
          onChange={(location) => onChange({ location })}
        />
        <ChoiceGroup
          legend="Property"
          name="property"
          value={input.property}
          options={properties}
          onChange={(property) => onChange({ property })}
        />
        <CheckField
          id="first-time"
          label="First-time buyer"
          checked={input.firstTime}
          onChange={(firstTime) => onChange({ firstTime })}
        />
        <CheckField
          id="citizen"
          label="Canadian citizen or permanent resident"
          checked={input.citizen}
          onChange={(citizen) => onChange({ citizen })}
        />
        {withheld(result) ? (
          <p>Taxes are calculated once the down payment is allowed.</p>
        ) : (
          <ul className="stats">
            {input.location !== "ot" ? (
              <li>
                <span>Ontario land transfer tax</span>
                <strong>{formatCAD(result.ontarioTax)}</strong>
              </li>
            ) : (
              <li>
                <span>Ontario land transfer tax</span>
                <strong>Not calculated outside Ontario</strong>
              </li>
            )}
            {result.ontarioRebate > 0 ? (
              <li>
                <span>Ontario first-time rebate</span>
                <strong>{formatCAD(-result.ontarioRebate)}</strong>
              </li>
            ) : null}
            {input.location === "to" ? (
              <li>
                <span>Toronto municipal land transfer tax</span>
                <strong>{formatCAD(result.torontoTax)}</strong>
              </li>
            ) : null}
            {result.torontoRebate > 0 ? (
              <li>
                <span>Toronto first-time rebate</span>
                <strong>{formatCAD(-result.torontoRebate)}</strong>
              </li>
            ) : null}
          </ul>
        )}
        {input.location === "on" ? <p>Toronto’s municipal land transfer tax does not apply outside the city.</p> : null}
        {!result.rebateEligible && input.location !== "ot" && !withheld(result) ? (
          <p>First-time rebates need a first-time buyer who is a citizen or permanent resident.</p>
        ) : null}
      </div>
    </details>
  );
}

function CashToClose({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  return (
    <details className="accordion">
      <summary>Cash to close</summary>
      <div className="accordion-body">
        <AmountField
          id="other-closing"
          label="Other closing costs"
          value={input.otherClosing}
          optional
          onValue={(otherClosing) => onChange({ otherClosing })}
        />
        {withheld(result) ? (
          <p>Cash to close is calculated once the down payment is allowed.</p>
        ) : (
          <>
            <ul className="stats">
              <li>
                <span>Down payment</span>
                <strong>{formatCAD(input.downPayment)}</strong>
              </li>
              {input.payPremiumInCash && result.premium > 0 ? (
                <li>
                  <span>Insurance premium</span>
                  <strong>{formatCAD(result.premium)}</strong>
                </li>
              ) : null}
              {result.pst > 0 ? (
                <li>
                  <span>Ontario sales tax on the premium</span>
                  <strong>{formatCAD(result.pst)}</strong>
                </li>
              ) : null}
              {input.location !== "ot" ? (
                <li>
                  <span>Ontario land transfer tax</span>
                  <strong>{formatCAD(result.ontarioTax - result.ontarioRebate)}</strong>
                </li>
              ) : null}
              {input.location === "to" ? (
                <li>
                  <span>Toronto land transfer tax</span>
                  <strong>{formatCAD(result.torontoTax - result.torontoRebate)}</strong>
                </li>
              ) : null}
              <li>
                <span>Other closing costs</span>
                <strong>{formatCAD(result.otherClosing)}</strong>
              </li>
            </ul>
            <p className="cash-total" data-testid="cash-to-close">
              <span>Cash to close</span>
              <strong>{formatCAD(result.cashToClose ?? 0)}</strong>
            </p>
          </>
        )}
      </div>
    </details>
  );
}

function QualifySection({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  return (
    <details className="accordion">
      <summary>Can I qualify?</summary>
      <div className="accordion-body">
        <AmountField
          id="income"
          label="Gross household income, per year"
          value={input.income}
          optional
          onValue={(income) => onChange({ income })}
        />
        <AmountField
          id="tax"
          label="Property tax"
          value={input.propertyTax}
          optional
          onValue={(propertyTax) => onChange({ propertyTax })}
        />
        <ChoiceGroup
          legend="Property tax timing"
          name="tax-period"
          value={input.taxPeriod}
          options={taxPeriods}
          onChange={(taxPeriod) => onChange({ taxPeriod })}
        />
        <AmountField
          id="heat"
          label="Heat, per month"
          value={input.heat}
          optional
          onValue={(heat) => onChange({ heat })}
        />
        <AmountField
          id="condo"
          label="Condo fees, per month"
          value={input.condo}
          optional
          onValue={(condo) => onChange({ condo })}
        />
        <AmountField
          id="debts"
          label="Other loan payments, per month"
          value={input.debts}
          optional
          onValue={(debts) => onChange({ debts })}
        />
        <AmountField
          id="revolving"
          label="Credit card and unsecured line balances"
          value={input.revolving}
          optional
          onValue={(revolving) => onChange({ revolving })}
        />
        {withheld(result) ? (
          <p>The stress test is calculated once the down payment is allowed.</p>
        ) : (
          <Qualify input={input} result={result} />
        )}
      </div>
    </details>
  );
}

function Meter({ ratio, limit, over }: { ratio: number; limit: number; over: boolean }) {
  const reduced = useReducedMotion();
  const scale = 0.6;
  const width = `${Math.min(ratio / scale, 1) * 100}%`;
  const mark = `${(limit / scale) * 100}%`;
  return (
    <div className={over ? "meter over" : "meter"}>
      <motion.span
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
        style={{ width }}
      />
      <i style={{ left: mark }} />
    </div>
  );
}

function insuranceBand(price: number, down: number): number {
  const ltv = loanToValue(price, down);
  if (ltv > 0.95 + 1e-10) return 4;
  if (ltv > 0.9 + 1e-10) return 3;
  if (ltv > 0.85 + 1e-10) return 2;
  if (ltv > 0.8 + 1e-10) return 1;
  return 0;
}

/** The entered down is not enough for that price, or the price crosses an insurance threshold. */
function rulesMayChange(currentPrice: number, down: number, impliedPrice: number): boolean {
  if (!(impliedPrice > 0)) return false;
  if (minDownPayment(impliedPrice) > down + 0.001) return true;
  if ((currentPrice < INSURED_PRICE_CAP) !== (impliedPrice < INSURED_PRICE_CAP)) return true;
  return insuranceBand(currentPrice, down) !== insuranceBand(impliedPrice, down);
}

function Qualify({ input, result }: { input: CalculatorInput; result: Scenario }) {
  const qualify = result.qualify;
  if (!qualify || qualify.status === "need-income") {
    return (
      <p>
        Add household income to see GDS and TDS. CMHC’s limits are 39% and 44%. Blank tax, heat, condo fees, and
        debts count as $0.
      </p>
    );
  }
  const gdsOver = qualify.status === "gds" || qualify.status === "both";
  const tdsOver = qualify.status === "tds" || qualify.status === "both";
  return (
    <>
      <p className="stress-line">
        Stress-test rate {formatPercentPoints(result.stress ?? 0)}. Qualifying payment{" "}
        {formatCAD(result.qualifyingPayment ?? 0)} monthly.
      </p>
      <p className={gdsOver ? "fail" : "pass"}>
        GDS {formatRatio(qualify.gds ?? 0)}, {gdsOver ? "over" : "under"} the {formatRatio(qualify.gdsLimit)} CMHC
        limit.
      </p>
      <Meter ratio={qualify.gds ?? 0} limit={qualify.gdsLimit} over={gdsOver} />
      <p className={tdsOver ? "fail" : "pass"}>
        TDS {formatRatio(qualify.tds ?? 0)}, {tdsOver ? "over" : "under"} the {formatRatio(qualify.tdsLimit)} CMHC
        limit.
      </p>
      <Meter ratio={qualify.tds ?? 0} limit={qualify.tdsLimit} over={tdsOver} />
      {qualify.assumedZeroCosts ? <p>Blank tax, heat, condo fees, and debts are counted as $0.</p> : null}
      <MaxQualify input={input} result={result} />
    </>
  );
}

function MaxQualify({ input, result }: { input: CalculatorInput; result: Scenario }) {
  const max = maxQualifyingPrincipal({
    annualRate: input.ratePercent / 100,
    amortYears: result.amortUsed,
    compounding: result.compounding,
    incomeAnnual: input.income,
    propertyTax: input.propertyTax,
    taxPeriod: input.taxPeriod,
    heatMonthly: input.heat,
    condoMonthly: input.condo,
    otherDebtsMonthly: input.debts,
    revolvingBalance: input.revolving,
  });
  if (!max) return null;
  const home = max.principal + input.downPayment;
  const limit =
    max.binding === "both"
      ? "GDS and TDS both limit it."
      : max.binding === "tds"
        ? "TDS limits it."
        : "GDS limits it.";
  return (
    <>
      <p data-testid="max-qualify">
        The most you could qualify for is {formatCAD(max.principal)}. {limit} With your{" "}
        {formatWhole(input.downPayment)} down, that is a {formatCAD(home)} home.
      </p>
      {rulesMayChange(input.price, input.downPayment, home) ? (
        <p data-testid="max-qualify-caveat">
          Minimum down payment and insurance premium rules may change that price.
        </p>
      ) : null}
    </>
  );
}

function formatAmortization(years: number, months: number): string {
  const parts = [years > 0 ? `${years} yr` : "", months > 0 ? `${months} mo` : ""].filter(Boolean);
  return parts.join(" ") || "0 mo";
}

/** Remaining term when the payment does not rise; otherwise the extension that holds it. */
function keepPaymentText(
  row: { payment: number; flatYears: number | null; flatMonths: number | null },
  currentPayment: number,
  yearsLeft: number,
): string {
  if (!(row.payment > currentPayment)) {
    const totalMonths = Math.max(0, Math.round(yearsLeft * 12));
    return `${formatAmortization(Math.floor(totalMonths / 12), totalMonths % 12)} left`;
  }
  if (row.flatYears == null || row.flatMonths == null) {
    return "Not possible, payment does not cover interest";
  }
  return formatAmortization(row.flatYears, row.flatMonths);
}

function formatPointsAbove(points: number): string {
  const shown = formatRate(Math.abs(points) * 100);
  if (points < -0.00005) return `−${shown} percentage points`;
  return `${shown} percentage points`;
}

function TriggerRate({ input, result }: { input: CalculatorInput; result: Scenario }) {
  const currentRate = input.ratePercent / 100;
  const start =
    withheld(result) || result.payment == null
      ? null
      : triggerRate({
          balance: result.loan,
          payment: result.payment,
          frequency: input.frequency,
          currentRate,
        });
  const renewal =
    start == null || result.renewal == null || result.endBalance == null || !(result.endBalance > 0)
      ? null
      : triggerRate({
          balance: result.endBalance,
          payment: result.payment ?? 0,
          frequency: input.frequency,
          currentRate,
        });

  return (
    <details className="accordion">
      <summary>Trigger rate</summary>
      <div className="accordion-body">
        {withheld(result) ? (
          <p>The trigger rate is calculated once the down payment is allowed.</p>
        ) : start == null ? (
          <p>The trigger rate needs a balance and a regular payment.</p>
        ) : (
          <>
            <ul className="stats">
              <li>
                <span>Trigger rate</span>
                <strong data-testid="trigger-rate">{formatPercentPoints(start.annualRate)}</strong>
              </li>
              <li>
                <span>Above your rate</span>
                <strong data-testid="trigger-gap">{formatPointsAbove(start.pointsAbove)}</strong>
              </li>
              {renewal ? (
                <>
                  <li>
                    <span>Trigger rate at renewal</span>
                    <strong data-testid="trigger-rate-renewal">{formatPercentPoints(renewal.annualRate)}</strong>
                  </li>
                  <li>
                    <span>Above your rate at renewal</span>
                    <strong data-testid="trigger-gap-renewal">{formatPointsAbove(renewal.pointsAbove)}</strong>
                  </li>
                </>
              ) : null}
            </ul>
            <p data-testid="trigger-sentence">{triggerRateSentence(start.annualRate)}</p>
          </>
        )}
      </div>
    </details>
  );
}

function Renewal({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  return (
    <details className="accordion">
      <summary>At renewal</summary>
      <div className="accordion-body">
        <div className="detail-field">
          <label htmlFor="term">Term</label>
          <select
            id="term"
            className="select"
            value={input.termYears}
            onChange={(event) => onChange({ termYears: Number(event.target.value) })}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((year) => (
              <option key={year} value={year}>
                {year} {year === 1 ? "year" : "years"}
              </option>
            ))}
          </select>
        </div>
        <RateField
          id="renewal-rate"
          label="Custom renewal rate"
          value={input.renewalCustomPercent}
          optional
          onValue={(renewalCustomPercent) => onChange({ renewalCustomPercent })}
        />
        {withheld(result) ? (
          <p>Renewal is calculated once the down payment is allowed.</p>
        ) : result.renewal == null ? (
          <p>The mortgage is paid off before the end of the term, so there is nothing to renew.</p>
        ) : (
          <>
            <ul className="stats">
              <li>
                <span>Balance after {input.termYears} {input.termYears === 1 ? "year" : "years"}</span>
                <strong data-testid="end-balance">{formatCAD(result.endBalance ?? 0)}</strong>
              </li>
              <li>
                <span>Principal paid</span>
                <strong>{formatCAD(result.termPrincipal ?? 0)}</strong>
              </li>
              <li>
                <span>Interest paid</span>
                <strong>{formatCAD(result.termInterest ?? 0)}</strong>
              </li>
            </ul>
            <p>
              {formatYears(result.yearsLeft ?? 0)} years left. The same rate can still change the payment, because the
              balance and the years remaining are both smaller.
            </p>
            <div className="table-wrap renewal-table" tabIndex={0} aria-label="Renewal payments">
              <table>
                <caption>Renewal payment at the same rate, one point higher, and two points higher.</caption>
                <thead>
                  <tr>
                    <th scope="col">Rate</th>
                    <th scope="col" className="figure">
                      Payment
                    </th>
                    <th scope="col" className="figure">
                      Change per month
                    </th>
                    <th scope="col" className="figure">
                      Keep payment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.renewal.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">
                        {row.label} {formatPercentPoints(row.rate)}
                      </th>
                      <td className="figure">{formatCAD(row.payment)}</td>
                      <td className="figure">{formatDelta(row.deltaMonthly)}</td>
                      <td className="figure">
                        {keepPaymentText(row, result.payment ?? 0, result.yearsLeft ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Extending the amortization at renewal needs the lender to agree.</p>
          </>
        )}
      </div>
    </details>
  );
}

function termSpan(years: number): string {
  const term = years > 0 ? years : 5;
  return term === 1 ? "1 year" : `${term} years`;
}

function CompareAnotherRate({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  const compared =
    withheld(result) || input.otherRatePercent == null
      ? null
      : compareRates({
          principal: result.loan,
          annualRate: input.ratePercent / 100,
          otherRate: input.otherRatePercent / 100,
          amortYears: result.amortUsed,
          termYears: input.termYears,
          frequency: input.frequency,
          compounding: result.compounding,
        });
  const per = result.frequencyLabel.toLowerCase();
  const over = termSpan(input.termYears);

  return (
    <details className="accordion">
      <summary>Compare another rate</summary>
      <div className="accordion-body">
        <RateField
          id="other-rate"
          label="Other rate"
          value={input.otherRatePercent}
          optional
          onValue={(otherRatePercent) => onChange({ otherRatePercent })}
        />
        {withheld(result) ? (
          <p>The comparison is calculated once the down payment is allowed.</p>
        ) : compared == null ? (
          <p>Enter another lender's rate to compare the payment and the interest.</p>
        ) : (
          <>
            <ul className="stats">
              <li>
                <span>Payment at the other rate</span>
                <strong data-testid="other-payment">
                  {formatCAD(compared.other.payment)} {per}
                </strong>
              </li>
              <li>
                <span>Payment difference</span>
                <strong data-testid="other-payment-delta">
                  {formatDelta(compared.paymentDelta)} {per}
                </strong>
              </li>
              <li>
                <span>Interest over {over} at this rate</span>
                <strong data-testid="term-interest">{formatCAD(compared.current.termInterest)}</strong>
              </li>
              <li>
                <span>Interest over {over} at the other rate</span>
                <strong data-testid="other-term-interest">{formatCAD(compared.other.termInterest)}</strong>
              </li>
              <li>
                <span>Interest difference over {over}</span>
                <strong data-testid="term-interest-delta">{formatDelta(compared.termInterestDelta)}</strong>
              </li>
              <li>
                <span>Interest difference over the full amortization</span>
                <strong data-testid="amort-interest-delta">{formatDelta(compared.amortInterestDelta)}</strong>
              </li>
            </ul>
            <p>Same principal, amortization, frequency, and compounding. A minus means the other rate costs less.</p>
          </>
        )}
      </div>
    </details>
  );
}

function clampedBreakYear(input: CalculatorInput): number {
  return Math.min(input.termYears, Math.max(0, Math.round(input.breakYear)));
}

function monthsLeftInTerm(input: CalculatorInput): number {
  const breakYear = clampedBreakYear(input);
  const termMonths = input.termYears * 12;
  const derived = (input.termYears - breakYear) * 12;
  if (input.breakMonthsLeft == null || !Number.isFinite(input.breakMonthsLeft)) return derived;
  return Math.min(termMonths, Math.max(0, Math.round(input.breakMonthsLeft)));
}

function balanceAtBreak(result: Scenario, year: number): number {
  if (year <= 0) return result.loan;
  return result.years.find((row) => row.year === year)?.balance ?? 0;
}

function balanceLabel(year: number): string {
  if (year <= 0) return "Balance today";
  return `Balance after ${year} ${year === 1 ? "year" : "years"}`;
}

function penaltyReason(rateType: CalculatorInput["rateType"], estimate: BreakPenalty): string {
  if (rateType === "variable") return "The penalty is three months' interest.";
  if (estimate.binding === "ird") return "The interest-rate differential is higher, so that is the penalty.";
  if (estimate.ird === estimate.threeMonthsInterest) {
    return "Three months' interest and the interest-rate differential are the same.";
  }
  return "Three months' interest is higher, so that is the penalty.";
}

function parseWholeMonths(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function BreakEarly({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  const breakYear = clampedBreakYear(input);
  const monthsLeft = monthsLeftInTerm(input);
  const termMonths = input.termYears * 12;
  const ready = input.rateType === "variable" || input.comparisonRatePercent != null;
  const estimate =
    withheld(result) || !ready
      ? null
      : breakPenalty({
          rateType: input.rateType,
          balance: balanceAtBreak(result, breakYear),
          contractRate: input.ratePercent / 100,
          monthsLeft,
          comparisonRate: (input.comparisonRatePercent ?? 0) / 100,
        });

  return (
    <details className="accordion">
      <summary>Break the mortgage early</summary>
      <div className="accordion-body">
        <ChoiceGroup
          legend="Rate type"
          name="break-rate-type"
          value={input.rateType}
          options={rateTypes}
          onChange={(rateType) => onChange({ rateType })}
        />
        <div className="detail-field">
          <label htmlFor="break-year">Break after</label>
          <select
            id="break-year"
            className="select"
            value={breakYear}
            onChange={(event) => onChange({ breakYear: Number(event.target.value), breakMonthsLeft: null })}
          >
            {Array.from({ length: input.termYears + 1 }, (_, year) => (
              <option key={year} value={year}>
                {year === 0 ? "Now" : `${year} ${year === 1 ? "year" : "years"}`}
              </option>
            ))}
          </select>
        </div>
        <div className="detail-field">
          <label htmlFor="months-left">Months left in the term</label>
          <DecimalField
            id="months-left"
            value={monthsLeft}
            format={(value) => String(Math.round(value))}
            parse={parseWholeMonths}
            min={0}
            max={termMonths}
            minLabel="0"
            maxLabel={String(termMonths)}
            onCommit={(value) => {
              if (value == null) return;
              const derived = (input.termYears - breakYear) * 12;
              onChange({ breakMonthsLeft: value === derived ? null : value });
            }}
          />
        </div>
        {input.rateType === "fixed" ? (
          <>
            <RateField
              id="comparison-rate"
              label="The rate the lender would charge today for a term about as long as what's left"
              value={input.comparisonRatePercent}
              optional
              onValue={(comparisonRatePercent) => onChange({ comparisonRatePercent })}
            />
            <p>Many big banks use posted rates minus the original discount, so the penalty can be much higher.</p>
          </>
        ) : null}
        {withheld(result) ? (
          <p>The penalty is calculated once the down payment is allowed.</p>
        ) : (
          <>
            <ul className="stats">
              <li>
                <span>{balanceLabel(breakYear)}</span>
                <strong data-testid="break-balance">{formatCAD(balanceAtBreak(result, breakYear))}</strong>
              </li>
              {estimate ? (
                <>
                  <li>
                    <span>Three months' interest</span>
                    <strong>{formatCAD(estimate.threeMonthsInterest)}</strong>
                  </li>
                  {estimate.ird != null ? (
                    <li>
                      <span>Interest-rate differential</span>
                      <strong>{formatCAD(estimate.ird)}</strong>
                    </li>
                  ) : null}
                  <li>
                    <span>Penalty</span>
                    <strong data-testid="break-penalty">{formatCAD(estimate.penalty)}</strong>
                  </li>
                </>
              ) : null}
            </ul>
            <p>
              {estimate
                ? penaltyReason(input.rateType, estimate)
                : "Enter the comparison rate to estimate the penalty."}
            </p>
          </>
        )}
        <p>
          Estimate only. Lenders calculate the interest-rate differential differently, including posted versus
          discounted rates. Check your mortgage contract.
        </p>
      </div>
    </details>
  );
}

function Breakdown({ input, result }: { input: CalculatorInput; result: Scenario }) {
  const principal = result.years.reduce((sum, row) => sum + row.principal, 0);
  const interest = result.years.reduce((sum, row) => sum + row.interest, 0);
  const total = principal + interest;
  const principalShare = total > 0 ? (principal / total) * 100 : 0;
  const comparison = useMemo(() => {
    if (withheld(result) || !(result.loan > 0)) return null;
    return monthlyComparisonSeries({
      loan: result.loan,
      annualRate: input.ratePercent / 100,
      amortYears: result.amortUsed,
      frequency: input.frequency,
      compounding: result.compounding,
    });
  }, [input, result]);
  return (
    <details className="accordion">
      <summary>Payment breakdown chart</summary>
      <div className="accordion-body">
        {withheld(result) ? (
          <p>The chart appears once the down payment is allowed.</p>
        ) : (
          <>
            <p className="cents-line" data-testid="payment-cents">
              <span>Payment</span>
              <strong>
                {formatCAD(result.payment ?? 0)} {result.frequencyLabel.toLowerCase()}
              </strong>
            </p>
            <div
              className="split"
              role="img"
              aria-label={`Principal ${formatCAD(principal)}, interest ${formatCAD(interest)}`}
            >
              <span className="split-principal" style={{ width: `${principalShare}%` }} />
              <span className="split-interest" style={{ width: `${100 - principalShare}%` }} />
            </div>
            <ul className="stats">
              <li>
                <span>
                  <i className="swatch swatch-principal" aria-hidden="true" />
                  Principal
                </span>
                <strong>{formatCAD(principal)}</strong>
              </li>
              <li>
                <span>
                  <i className="swatch swatch-interest" aria-hidden="true" />
                  Interest
                </span>
                <strong>{formatCAD(interest)}</strong>
              </li>
            </ul>
            <Suspense fallback={<div className="chart" aria-hidden="true" />}>
              <BalanceChart points={comparison ?? result.chart} compare={comparison != null} />
            </Suspense>
          </>
        )}
      </div>
    </details>
  );
}

function downloadSchedule(rows: Scenario["years"]) {
  const blob = new Blob([scheduleCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mortgage-schedule.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function YearByYear({ result }: { result: Scenario }) {
  return (
    <details className="accordion">
      <summary>Year-by-year</summary>
      <div className="accordion-body">
        {result.years.length === 0 ? (
          <p>The year-by-year table appears once the down payment is allowed.</p>
        ) : (
          <>
            <button
              type="button"
              className="share csv-download"
              data-testid="download-csv"
              onClick={() => downloadSchedule(result.years)}
            >
              Download CSV
            </button>
            <div className="table-wrap" tabIndex={0} aria-label="Year-by-year schedule">
              <table>
                <caption>Balance, principal, and interest at the end of each year.</caption>
                <thead>
                  <tr>
                    <th scope="col">Year</th>
                    <th scope="col" className="figure">
                      Paid
                    </th>
                    <th scope="col" className="figure">
                      Principal
                    </th>
                    <th scope="col" className="figure">
                      Interest
                    </th>
                    <th scope="col" className="figure">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((row) => (
                    <tr key={row.year}>
                      <th scope="row">{row.year}</th>
                      <td className="figure">{formatCAD(row.paid)}</td>
                      <td className="figure">{formatCAD(row.principal)}</td>
                      <td className="figure">{formatCAD(row.interest)}</td>
                      <td className="figure">{formatCAD(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </details>
  );
}

function How({
  input,
  result,
  onChange,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
}) {
  const note = amortNote(result);
  const compounding =
    result.compounding === "monthly"
      ? "Variable rate, compounded monthly: i = (1 + r/12)^(12/n) − 1."
      : "Fixed-style semi-annual compounding: i = (1 + r/2)^(2/n) − 1.";
  return (
    <details className="accordion">
      <summary>How we calculate</summary>
      <div className="accordion-body">
        <p>Canadian semi-annual compounding. Estimates only.</p>
        <ChoiceGroup
          legend="Rate type"
          name="rate-type"
          value={input.rateType}
          options={rateTypes}
          onChange={(rateType) => onChange({ rateType })}
        />
        {input.rateType === "variable" ? (
          <ChoiceGroup
            legend="Variable compounding"
            name="compounding"
            value={input.variableCompounding}
            options={compounds}
            onChange={(variableCompounding) => onChange({ variableCompounding })}
          />
        ) : null}
        {result.blocked ? (
          <p>The payment is withheld until the down payment is allowed.</p>
        ) : (
          <>
            <p>{compounding}</p>
            <p>
              The payment is the annuity payment on {formatCAD(result.loan)}, rounded half-up to the cent. Accelerated
              bi-weekly is half the monthly payment, and accelerated weekly is a quarter, paid 26 or 52 times a year.
            </p>
            <p>
              The qualifying rate is the greater of the contract rate plus 2 percentage points and 5.25%. GDS uses that
              monthly payment, property tax, heat, and half of condo fees, divided by monthly income. TDS adds other
              debts and 3% of revolving balances. The most you could qualify for is the largest mortgage that still
              fits both limits. The home price adds the down payment already entered.
            </p>
          </>
        )}
        {note ? <p>{note}</p> : null}
        <ul className="sources">
          {ruleList.map((rule) => (
            <li key={rule.id}>
              <a href={rule.sourceUrl}>{rule.title}</a>
              <span>{rule.value}</span>
            </li>
          ))}
        </ul>
        <p>
          Rules last checked {RULES_CHECKED}. Estimates for education, not advice or a quote. The 4.50% starting rate
          is an example, not a quote.
        </p>
      </div>
    </details>
  );
}
