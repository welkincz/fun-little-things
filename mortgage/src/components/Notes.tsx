import { useState } from "react";
import { FREQUENCIES } from "../lib/mortgage/payment";
import { roundCents } from "../lib/mortgage/money";
import type { CalculatorInput, Scenario } from "../lib/mortgage/scenario";
import { formatWhole } from "../format";
import { AmountField, CheckField, ChoiceGroup, FieldNote, RateField } from "./Fields";

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

function amortNote(result: Scenario): string | null {
  if (result.blocked) return null;
  if (result.amortCapped) {
    return "A 30-year insured mortgage is only available if you are a first-time buyer or the home is a new build. This estimate uses 25 years.";
  }
  if (result.uninsuredAmortAssumption && result.amortUsed > 25) {
    return "Past 25 years, an uninsured amortization is the lender's choice, not a federal rule. 30 years is an assumption you can change.";
  }
  if (result.insuredLongReason === "both") {
    return "30 years is available on this insured mortgage because you are a first-time buyer and the home is a new build.";
  }
  if (result.insuredLongReason === "first-time") {
    return "30 years is available on this insured mortgage because you are a first-time buyer.";
  }
  if (result.insuredLongReason === "new-build") {
    return "30 years is available on this insured mortgage because the home is a new build.";
  }
  return null;
}

export function Notes({
  input,
  result,
  onChange,
  onPrice,
  onDown,
  onUseMinimum,
}: {
  input: CalculatorInput;
  result: Scenario;
  onChange: (patch: Partial<CalculatorInput>) => void;
  onPrice: (price: number) => void;
  onDown: (down: number) => void;
  onUseMinimum: () => void;
}) {
  const [qualifyOpen, setQualifyOpen] = useState(input.income != null);
  const percent = input.price > 0 ? (input.downPayment / input.price) * 100 : 0;
  const downAlert =
    result.blocked === "not-insurable"
      ? `Not insurable. At ${formatWhole(1_500_000)} and above, less than 20% down cannot be insured. The minimum is ${formatWhole(result.minimumDown)}.`
      : result.blocked === "down-min"
        ? `This is below the minimum down payment of ${formatWhole(result.minimumDown)}.`
        : result.blocked === "down-high"
          ? "The down payment is higher than the purchase price."
          : undefined;
  const note = amortNote(result);

  return (
    <form className="notes" aria-label="Mortgage details" onSubmit={(event) => event.preventDefault()}>
      <header className="mast">
        <h1>Mortgage</h1>
        <p>Payment, cash to close, the stress test, and renewal, for a home in Canada.</p>
      </header>

      <fieldset className="group">
        <legend>Home</legend>
        <AmountField
          id="price"
          label="Purchase price"
          value={input.price}
          onValue={(value) => {
            if (value != null && value >= 0) onPrice(value);
          }}
        />
        <ChoiceGroup
          legend="Where"
          name="location"
          value={input.location}
          options={locations}
          onChange={(location) => onChange({ location })}
          hint={
            input.location === "ot"
              ? "Land transfer tax is not calculated outside Ontario."
              : undefined
          }
        />
        <ChoiceGroup
          legend="Property"
          name="property"
          value={input.property}
          options={properties}
          onChange={(property) => onChange({ property })}
          hint="Houses and duplexes use the higher tax brackets. Other property stays at 2%."
        />
        <CheckField
          id="new-build"
          label="New build"
          checked={input.newBuild}
          onChange={(newBuild) => onChange({ newBuild })}
          hint="A new build can qualify for 30 years on an insured mortgage."
        />
      </fieldset>

      <fieldset className="group">
        <legend>Buyer</legend>
        <CheckField
          id="first-time"
          label="First-time buyer"
          checked={input.firstTime}
          onChange={(firstTime) => onChange({ firstTime })}
          hint="Used for the land transfer tax rebate and for a 30-year insured mortgage."
        />
        <CheckField
          id="citizen"
          label="Canadian citizen or permanent resident"
          checked={input.citizen}
          onChange={(citizen) => onChange({ citizen })}
          hint="The Ontario and Toronto rebates require this. If not, foreign-buyer taxes may apply. They are not calculated here."
        />
      </fieldset>

      <fieldset className="group">
        <legend>Down payment</legend>
        <div className="pair">
          <AmountField
            id="down"
            label="Amount"
            value={input.downPayment}
            onValue={(value) => {
              if (value != null) onDown(value);
            }}
            invalid={result.blocked === "down-min" || result.blocked === "not-insurable" || result.blocked === "down-high"}
            alert={downAlert}
          />
          <RateField
            id="down-percent"
            label="Percent"
            value={percent}
            onValue={(value) => {
              if (value != null) onDown(roundCents((input.price * value) / 100));
            }}
            digits={4}
          />
        </div>
        <p className="hint">Minimum for this price is {formatWhole(result.minimumDown)}.</p>
        <button type="button" className="action" onClick={onUseMinimum}>
          Use minimum
        </button>
      </fieldset>

      <fieldset className="group">
        <legend>Mortgage</legend>
        <RateField
          id="rate"
          label="Interest rate"
          value={input.ratePercent}
          onValue={(ratePercent) => {
            if (ratePercent != null) onChange({ ratePercent });
          }}
          hint="Example rate, enter your quote. This is not today's rate."
        />
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
            hint="This is not a federal rule. Monthly is the default here. Switch it if your lender compounds semi-annually."
          />
        ) : null}
        <div className="pair">
          <div className="field">
            <label htmlFor="term">Term</label>
            <div className="line-input">
              <select
                id="term"
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
          </div>
          <div className="field">
            <label htmlFor="amort">Amortization</label>
            <div className="line-input">
              <input
                id="amort"
                inputMode="numeric"
                value={input.amortYears}
                aria-describedby={note ? "amort-note" : undefined}
                onChange={(event) => {
                  const years = Number(event.target.value);
                  if (Number.isInteger(years) && years >= 1 && years <= 30) onChange({ amortYears: years });
                }}
              />
              <span className="suffix">years</span>
            </div>
          </div>
        </div>
        {note ? (
          <p className="hint status" id="amort-note" role="status">
            {note}
          </p>
        ) : result.uninsuredAmortAssumption ? (
          <FieldNote>Uninsured mortgages are capped at 30 years on this page. That cap is an assumption.</FieldNote>
        ) : null}
        <ChoiceGroup
          legend="Payment frequency"
          name="frequency"
          value={input.frequency}
          options={FREQUENCIES.map((item) => ({ id: item.id, label: item.label }))}
          onChange={(frequency) => onChange({ frequency })}
        />
        <CheckField
          id="premium-cash"
          label="Pay the insurance premium in cash at closing"
          checked={input.payPremiumInCash}
          onChange={(payPremiumInCash) => onChange({ payPremiumInCash })}
          hint="Otherwise the premium is added to the mortgage. Provincial sales tax on the premium is always cash."
        />
      </fieldset>

      <details
        className="fold"
        open={qualifyOpen}
        onToggle={(event) => setQualifyOpen(event.currentTarget.open)}
      >
        <summary>Will I qualify?</summary>
        <div className="fold-body">
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
            hint="Half of this is counted in GDS and TDS."
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
            hint="Counted at 3% of the balance each month."
          />
        </div>
      </details>

      <fieldset className="group">
        <legend>Closing and renewal</legend>
        <AmountField
          id="other-closing"
          label="Other closing costs"
          value={input.otherClosing}
          optional
          placeholder="Legal, title, inspection"
          onValue={(otherClosing) => onChange({ otherClosing })}
          hint="No amount is filled in. Add your own quotes."
        />
        <RateField
          id="renewal-rate"
          label="Custom renewal rate"
          value={input.renewalCustomPercent}
          optional
          onValue={(renewalCustomPercent) => onChange({ renewalCustomPercent })}
          hint="Leave this blank to compare only the same rate, +1%, and +2%."
        />
      </fieldset>
    </form>
  );
}
