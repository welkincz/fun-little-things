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

## 4. Ontario and Toronto land transfer tax

A standalone calculator that reuses the mortgage `rules.ts` brackets.

Price, location, property type, and first-time buyer. Show Ontario land transfer tax, Toronto municipal land transfer tax, the rebates, and the net. The Toronto brackets are the April 1, 2026 rates.

## 5. Mortgage renewal shock

Balance, years left, and the old and new rates. Show the new payment, the change, and what happens if the amortization is extended to keep the payment flat.

## 6. Minimum down payment and insurability

Price in, then the minimum down payment, the CMHC tier, whether the mortgage is insurable, and whether 30 years is available. The insured cap is $1,500,000, not $1,000,000.

## 7. CMHC premium and sales tax

Price, down payment, and amortization. Show the premium percent, the premium in dollars, and the Ontario sales tax due in cash.

## 8. FHSA, RRSP, or TFSA first

An interactive order for someone saving, using a marginal tax rate they enter. Verify the FHSA annual and lifetime limits on canada.ca before building. Those limits were not verified in the research.

## 9. Rent notice date calculator

Date math only: 90 days' notice and the 12-month gap. This can ship as a mode of the rent increase checker.

## 10. Roommate utility splitter

Bills, people, and days present. Split by days, with optional weights. Share the result as a link.

## 11. Restaurant bill, HST, and tip

Subtotal, then HST, then tip, then the amount per person. Verify the HST rate on a CRA page before shipping. It was not fetched for the research.

## 12. Accelerated bi-weekly versus monthly

The same mortgage, two frequencies, side by side. Show payoff time and interest saved, and one chart. Use the FCAC and WOWA definitions already in the mortgage engine: accelerated bi-weekly is half the monthly payment, 26 times a year.

## 13. Prepay the mortgage or invest

The person enters the mortgage rate, their marginal tax rate, and an expected return. Show both paths. Do not invent a return.

## 14. Rent versus buy in Toronto

Rent, rent growth, price, down payment, rate, property tax, and a maintenance percent. Every one of those is a user input. Do not invent defaults for them. Compare net worth over a number of years they choose.

## 15. Private PDF merge

Merge, reorder, and rotate PDFs in the browser with pdf-lib. Nothing is uploaded. The market is crowded. Build it only as a showcase.
