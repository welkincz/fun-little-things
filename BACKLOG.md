# Backlog

One sitting each. Next item is at the top. The mortgage calculator is already in the repo.

Do not treat unverified claims as rules. Where a note says to verify a figure, check the official page before encoding it.

## 1. Ontario rent increase checker

Can a landlord raise the rent that much, on that date?

Inputs: current rent, date of the last increase or move-in, date the notice arrived, proposed rent, effective date, whether the unit was first occupied after November 15, 2018 (yes / no / not sure), and whether the notice was on an LTB form.

Output: a verdict for the amount, the 12-month gap, the 90-day notice, and the form. Show the maximum legal new rent and the earliest legal effective date. Include the guideline history, links to the LTB and ontario.ca, a summary the tenant can paste into an email, and a shareable URL.

Rules, from ontario.ca (residential rent increases, updated June 23, 2026): the guideline is 2.1% for 2026 and 1.9% for 2027, and the cap is 2.5%. At least 12 months since the last increase or the start of the tenancy. At least 90 days' written notice on the LTB form. Units first occupied for residential use after November 15, 2018 are exempt, along with turnover, community housing, long-term care, and commercial tenancies.

Above-guideline increases, care homes, and social housing are out of scope: say so and point to the LTB. Do not encode a 10-year expiry for above-guideline increases. That claim is not verified.

Disclaimer: information, not legal advice.

## 2. Group expense splitter

A shared ledger with no account and no install. The ledger lives in the URL hash, with localStorage as a backup.

Add people. Add expenses with a payer, an amount, and a split that is equal, by shares, or by exact amounts. Show running balances and the smallest set of transfers that settles them. Copy the link, and copy the settlement as text for an e-Transfer. Dinner mode: subtotal, then 13% HST, then a tip percent, then the amount per person. Export CSV.

Cap the ledger at about 100 expenses so the link stays usable. Do not state a daily limit for any other product as fact.

## 3. GST/HST registration tracker

For freelancers and side work. The CRA small-supplier test is not a rolling 12 months.

Enter taxable revenue by calendar quarter, or by month rolled up to quarters. Include worldwide and export revenue. A rideshare or taxi flag forces registration.

Output: still a small supplier, or must register. Say which test tripped (one quarter, or four consecutive quarters). Show the date the person stops being a small supplier, when to start charging, the 29-day registration deadline, and how much room is left.

Use the CRA worked examples as one-click demos and as tests. Keep the numbers in the browser. Link to the CRA page. Say this is general information, and leave out charities and public service bodies.

Source to follow: the CRA page "When to register for and start charging the GST/HST".

## 8. FHSA, RRSP, or TFSA first

An interactive order for someone saving, using a marginal tax rate they enter. Verify the FHSA annual and lifetime limits on canada.ca before building. Those limits were not verified in the research.

## 9. Rent notice date calculator

Date math only: 90 days' notice and the 12-month gap. This can ship as a mode of the rent increase checker.

## 10. Roommate utility splitter

Bills, people, and days present. Split by days, with optional weights. Share the result as a link.

## 11. Restaurant bill, HST, and tip

Subtotal, then HST, then tip, then the amount per person. Verify the HST rate on a CRA page before shipping. It was not fetched for the research.

## 14. Rent versus buy in Toronto

Rent, rent growth, price, down payment, rate, property tax, and a maintenance percent. Every one of those is a user input. Do not invent defaults for them. Compare net worth over a number of years they choose.

## 15. Private PDF merge

Merge, reorder, and rotate PDFs in the browser with pdf-lib. Nothing is uploaded. The market is crowded. Build it only as a showcase.

## Done

- **Break-early penalty estimate.** Beside renewal, the calculator estimates the penalty for breaking a fixed or variable mortgage during the term. Variable is three months of interest. Fixed is the greater of that and the interest-rate differential, using a comparison rate the borrower enters. The balance comes from the amortization already on screen.
- **Download the mortgage schedule.** The year-by-year table has a Download CSV button that saves the schedule on screen as mortgage-schedule.csv.
- **Max you could qualify for.** With household income entered, the qualify section shows the largest mortgage that still fits the GDS and TDS limits, which limit binds, and the home price with the down payment already entered.
- **Prepay the mortgage or invest.** With a yearly lump sum set, compare prepaying it against investing it in a TFSA or a non-registered account, and show the break-even return.
- **Yearly lump sum.** One extra payment a year shows how much sooner the mortgage is paid off, and the interest saved.
- **Ontario and Toronto land transfer tax.** Already covered inside the mortgage calculator.
- **Minimum down payment and insurability.** Already covered inside the mortgage calculator.
- **CMHC premium and sales tax.** Already covered inside the mortgage calculator.
- **Mortgage renewal shock.** Renewal shock is now part of the mortgage calculator.
- **Accelerated payoff.** Accel. bi-weekly and accelerated weekly show how many years and months sooner the mortgage is paid off, and the interest saved versus monthly, on the same loan.
- **Accelerated vs monthly chart.** On accelerated bi-weekly or weekly, the balance chart also draws the monthly balance on the same loan.
- **Mortgage og.png v2.** `mortgage/public/og.png` (1200×627) says “Canadian mortgage calculator” in Fraunces, with `$800k · 20% down · 25 yr`, and shows the $3,542 payment once in the result card. Regenerate with `npm run og` from `mortgage/`.
