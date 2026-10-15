import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  formatCAD,
  formatDelta,
  formatDollars,
  formatPercentPoints,
  formatRatio,
  formatYears,
} from "../format";
import type { FrequencyId } from "../lib/mortgage/payment";
import { ruleList, RULES_CHECKED } from "../lib/mortgage/rules";
import type { CalculatorInput, Scenario } from "../lib/mortgage/scenario";
import { AnimatedMoney } from "./AnimatedMoney";
import { BalanceChart } from "./BalanceChart";
import { AmountField, CheckField, ChoiceGroup, RateField, Segmented } from "./Fields";

const FREQUENCIES: { id: FrequencyId; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "biweekly", label: "Bi-weekly" },
  { id: "accel-biweekly", label: "Accel. bi-weekly" },
  { id: "weekly", label: "Weekly" },
];

const EXTRA_FREQUENCY: Partial<Record<FrequencyId, string>> = {
  semimonthly: "Semi-monthly",
  "accel-weekly": "Accel. weekly",
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
  const spoken =
    result.payment == null ? "Payment unavailable" : `${formatCAD(result.payment)} ${affix.hero}`;
  const [live, setLive] = useState(spoken);
  const options = FREQUENCIES.some((item) => item.id === input.frequency)
    ? FREQUENCIES
    : [...FREQUENCIES, { id: input.frequency, label: EXTRA_FREQUENCY[input.frequency] ?? input.frequency }];

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
  return (
    <div className="details" id="scenario-details">
      <Insurance input={input} result={result} onChange={onChange} />
      <LandTransfer input={input} result={result} onChange={onChange} />
      <CashToClose input={input} result={result} onChange={onChange} />
      <QualifySection input={input} result={result} onChange={onChange} />
      <Renewal input={input} result={result} onChange={onChange} />
      <Breakdown result={result} />
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
          <Qualify result={result} />
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

function Qualify({ result }: { result: Scenario }) {
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
    </>
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
            <div className="table-wrap">
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

function Breakdown({ result }: { result: Scenario }) {
  const principal = result.years.reduce((sum, row) => sum + row.principal, 0);
  const interest = result.years.reduce((sum, row) => sum + row.interest, 0);
  const total = principal + interest;
  const principalShare = total > 0 ? (principal / total) * 100 : 0;
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
            <BalanceChart points={result.chart} />
          </>
        )}
      </div>
    </details>
  );
}

function YearByYear({ result }: { result: Scenario }) {
  return (
    <details className="accordion">
      <summary>Year-by-year</summary>
      <div className="accordion-body">
        {result.years.length === 0 ? (
          <p>The year-by-year table appears once the down payment is allowed.</p>
        ) : (
          <div className="table-wrap">
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
              debts and 3% of revolving balances.
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
