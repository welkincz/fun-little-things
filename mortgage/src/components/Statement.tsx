import { motion, useReducedMotion } from "motion/react";
import { formatCAD, formatDelta, formatPercentPoints, formatRatio, formatWhole, formatYears } from "../format";
import { ruleList, RULES_CHECKED } from "../lib/mortgage/rules";
import type { CalculatorInput, Scenario } from "../lib/mortgage/scenario";
import { AnimatedMoney } from "./AnimatedMoney";
import { BalanceChart } from "./BalanceChart";

function place(input: CalculatorInput): string {
  if (input.location === "to") return "A home in Toronto.";
  if (input.location === "on") return "A home in Ontario, outside Toronto.";
  return "A home outside Ontario.";
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
        transition={{ duration: 0.45 }}
        style={{ width }}
      />
      <i style={{ left: mark }} />
    </div>
  );
}

export function Statement({
  input,
  result,
  copied,
  onCopy,
}: {
  input: CalculatorInput;
  result: Scenario;
  copied: boolean;
  onCopy: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <main className="statement" id="results" tabIndex={-1}>
      <div className="statement-top">
        <p className="where">{place(input)}</p>
        <button type="button" className="action" data-testid="copy-link" onClick={onCopy}>
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>

      {result.blocked ? <Blocked result={result} reduced={reduced} /> : <Figures input={input} result={result} reduced={reduced} />}

      <details className="how">
        <summary>How we calculated this</summary>
        <How input={input} result={result} />
      </details>

      <footer className="disclaimer">
        <p>
          Estimates for education, not advice or a quote. Lender rules vary. Rules last checked {RULES_CHECKED}{" "}
          from CMHC, OSFI, FCAC, Ontario, City of Toronto.
        </p>
      </footer>
    </main>
  );
}

function Blocked({ result, reduced }: { result: Scenario; reduced: boolean | null }) {
  const title =
    result.blocked === "not-insurable"
      ? "Not insurable"
      : result.blocked === "down-high"
        ? "Down payment is too high"
        : result.blocked === "price"
          ? "Enter a purchase price"
          : "Down payment is short";
  const copy =
    result.blocked === "not-insurable"
      ? `At ${formatWhole(1_500_000)} and above, a down payment under 20% cannot be insured. High-ratio insurance stops below that price.`
      : result.blocked === "down-high"
        ? "The down payment cannot be more than the purchase price."
        : result.blocked === "price"
          ? "The payment is calculated from the purchase price."
          : "A mortgage at this price needs at least the minimum down payment.";
  return (
    <section className="hero" data-testid="blocked">
      <div className="hero-stick">
      <h2>{title}</h2>
      <motion.div
        className="hero-rule"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      {result.blocked === "not-insurable" || result.blocked === "down-min" ? (
        <p className="pay-row" data-testid="down-error">
          <span className="pay-figure">
            <AnimatedMoney value={result.minimumDown} />
          </span>
          <span className="pay-freq">minimum down</span>
        </p>
      ) : null}
      </div>
      <p>{copy}</p>
    </section>
  );
}

function Figures({
  input,
  result,
  reduced,
}: {
  input: CalculatorInput;
  result: Scenario;
  reduced: boolean | null;
}) {
  const payment = result.payment ?? 0;
  const shorter =
    result.payoffYears != null && result.amortUsed - result.payoffYears > 0.05;
  return (
    <>
      <section className="hero">
        <div className="hero-stick">
          <h2>Payment</h2>
          <motion.div
            className="hero-rule"
            initial={reduced ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <p className="pay-row" data-testid="payment" aria-live="polite">
            <span className="pay-figure">
              <AnimatedMoney value={payment} />
            </span>
            <span className="pay-freq">{result.frequencyLabel.toLowerCase()}</span>
          </p>
        </div>
        <div className="lede">
          {input.frequency !== "monthly" ? (
            <p>About {formatCAD(result.monthlyEquivalent ?? 0)} a month.</p>
          ) : null}
          {shorter ? (
            <p>
              Paid off in {formatYears(result.payoffYears ?? 0)} years instead of {result.amortUsed}.
            </p>
          ) : null}
          {result.premium > 0 ? (
            <p>
              CMHC premium {formatPercentPoints(result.premiumRate)}, {formatCAD(result.premium)}
              {input.payPremiumInCash ? ", paid in cash" : ", added to the loan"}. Sales tax on the premium is{" "}
              {formatCAD(result.pst)}, paid in cash. CMHC rates; other insurers may differ.
            </p>
          ) : (
            <p>No default-insurance premium. The down payment is at least 20%.</p>
          )}
          <p>
            Stress-test rate {formatPercentPoints(result.stress ?? 0)}. Qualifying payment{" "}
            {formatCAD(result.qualifyingPayment ?? 0)} monthly, on {formatCAD(result.loan)} borrowed.
          </p>
          {!input.citizen ? (
            <p>
              No first-time rebate, because the buyer is not a citizen or permanent resident. Ontario’s
              non-resident speculation tax is 25%, and Toronto’s municipal tax is 10%. Neither is calculated here.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2>Cash to close</h2>
        <ul className="leaders">
          <li>
            <span>
              <em>Down payment</em>
            </span>
            <strong>{formatCAD(input.downPayment)}</strong>
          </li>
          {input.payPremiumInCash && result.premium > 0 ? (
            <li>
              <span>
                <em>Insurance premium</em>
              </span>
              <strong>{formatCAD(result.premium)}</strong>
            </li>
          ) : null}
          {result.pst > 0 ? (
            <li>
              <span>
                <em>Ontario sales tax on the premium</em>
              </span>
              <strong>{formatCAD(result.pst)}</strong>
            </li>
          ) : null}
          {input.location !== "ot" ? (
            <li>
              <span>
                <em>Ontario land transfer tax</em>
              </span>
              <strong>{formatCAD(result.ontarioTax)}</strong>
            </li>
          ) : null}
          {result.ontarioRebate > 0 ? (
            <li className="rebate">
              <span>
                <em>Ontario first-time rebate</em>
              </span>
              <strong>{formatCAD(-result.ontarioRebate)}</strong>
            </li>
          ) : null}
          {input.location === "to" ? (
            <li>
              <span>
                <em>Toronto municipal land transfer tax</em>
              </span>
              <strong>{formatCAD(result.torontoTax)}</strong>
            </li>
          ) : null}
          {result.torontoRebate > 0 ? (
            <li className="rebate">
              <span>
                <em>Toronto first-time rebate</em>
              </span>
              <strong>{formatCAD(-result.torontoRebate)}</strong>
            </li>
          ) : null}
          <li>
            <span>
              <em>Other closing costs</em>
            </span>
            <strong>{formatCAD(result.otherClosing)}</strong>
          </li>
        </ul>
        <p className="cash-total" data-testid="cash-to-close">
          <span>Cash to close</span>
          <AnimatedMoney value={result.cashToClose ?? 0} />
        </p>
        {input.location === "ot" ? <p className="hint ink">Land transfer tax is not calculated outside Ontario.</p> : null}
        {input.location === "on" ? (
          <p className="hint ink">Toronto’s municipal land transfer tax does not apply outside the city.</p>
        ) : null}
        {!result.rebateEligible && input.location !== "ot" ? (
          <p className="hint ink">
            First-time rebates are only for a first-time buyer who is a Canadian citizen or permanent resident.
          </p>
        ) : null}
        {input.otherClosing == null ? (
          <p className="hint ink">Other closing costs are blank, so they add $0.</p>
        ) : null}
      </section>

      <section>
        <h2>Will I qualify?</h2>
        <Qualify result={result} />
      </section>

      <section>
        <h2>End of term</h2>
        <p className="hint ink">After {input.termYears} {input.termYears === 1 ? "year" : "years"}.</p>
        <ul className="plain">
          <li>
            <span>Balance</span>
            <strong data-testid="end-balance">
              <AnimatedMoney value={result.endBalance ?? 0} />
            </strong>
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
      </section>

      <section>
        <h2>At renewal</h2>
        {result.renewal == null ? (
          <p>The mortgage is paid off before the end of the term, so there is nothing to renew.</p>
        ) : (
          <>
            <p className="hint ink">
              {formatYears(result.yearsLeft ?? 0)} years left. The same rate can still change the payment, because
              the balance and the years remaining are both smaller.
            </p>
            <div className="table-wrap short">
              <table>
                <caption>Renewal payment at the same rate, one point higher, and two points higher.</caption>
                <thead>
                  <tr>
                    <th scope="col">Rate</th>
                    <th scope="col" className="num">
                      Payment
                    </th>
                    <th scope="col" className="num">
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
                      <td className="num">{formatCAD(row.payment)}</td>
                      <td className="num">{formatDelta(row.deltaMonthly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section>
        <h2>Balance over time</h2>
        <p className="hint ink">The year-by-year table below has the same balances.</p>
        <BalanceChart points={result.chart} />
      </section>

      <section>
        <h2>Year by year</h2>
        <div className="table-wrap">
          <table>
            <caption>Balance, principal, and interest at the end of each year.</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col" className="num">
                  Paid
                </th>
                <th scope="col" className="num">
                  Principal
                </th>
                <th scope="col" className="num">
                  Interest
                </th>
                <th scope="col" className="num">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {result.years.map((row) => (
                <tr key={row.year}>
                  <th scope="row">{row.year}</th>
                  <td className="num">{formatCAD(row.paid)}</td>
                  <td className="num">{formatCAD(row.principal)}</td>
                  <td className="num">{formatCAD(row.interest)}</td>
                  <td className="num">{formatCAD(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Qualify({ result }: { result: Scenario }) {
  const qualify = result.qualify;
  if (!qualify || qualify.status === "need-income") {
    return (
      <p>
        Add household income to see GDS and TDS. CMHC’s limits are 39% and 44%. Blank tax, heat, condo fees, and
        debts count as $0. Nothing is filled in for you.
      </p>
    );
  }
  const gdsOver = qualify.status === "gds" || qualify.status === "both";
  const tdsOver = qualify.status === "tds" || qualify.status === "both";
  return (
    <>
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
      {gdsOver ? (
        <p>A lower price, a larger down payment, or more income would bring the housing ratio down.</p>
      ) : null}
      {tdsOver && !gdsOver ? (
        <p>The housing payment fits. Other debts are what push TDS over the limit.</p>
      ) : null}
      {qualify.assumedZeroCosts ? (
        <p className="hint ink">Blank tax, heat, condo fees, and debts are counted as $0.</p>
      ) : null}
      <p className="hint ink">
        These are CMHC’s limits. A lender can be tighter, and credit unions do not have to use the federal stress
        test.
      </p>
    </>
  );
}

function How({ input, result }: { input: CalculatorInput; result: Scenario }) {
  const compounding =
    result.compounding === "monthly"
      ? "Variable rate, compounded monthly: i = (1 + r/12)^(12/n) − 1."
      : "Fixed-style semi-annual compounding: i = (1 + r/2)^(2/n) − 1.";
  return (
    <div className="how-body">
      {result.blocked ? (
        <p>The payment is withheld until the down payment is allowed. The tax brackets below still describe the rules.</p>
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
      <ul className="sources">
        {ruleList.map((rule) => (
          <li key={rule.id}>
            <a href={rule.sourceUrl}>{rule.title}</a>
            <span>{rule.value}</span>
          </li>
        ))}
      </ul>
      <p>Rules last checked {RULES_CHECKED}. The 4.50% starting rate is an example, not a quote.</p>
      {input.rateType === "variable" ? (
        <p>Variable compounding is editable because it is lender-specific.</p>
      ) : null}
    </div>
  );
}
