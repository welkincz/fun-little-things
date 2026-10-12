export const RULES_CHECKED = "2026-10-11";

export type RuleStatus = "verified" | "secondary" | "unverified";

export type Rule = {
  id: string;
  title: string;
  value: string;
  source: string;
  sourceUrl: string;
  verifiedOn: typeof RULES_CHECKED;
  status: RuleStatus;
};

const on = RULES_CHECKED;

export const rules = {
  R1: {
    id: "R1",
    title: "Interest Act disclosure basis",
    value:
      "Blended-payment mortgages state the rate calculated yearly or half-yearly, not in advance.",
    source: "Interest Act, section 6",
    sourceUrl: "https://laws-lois.justice.gc.ca/eng/acts/i-15/page-1.html",
    verifiedOn: on,
    status: "verified",
  },
  R2: {
    id: "R2",
    title: "Fixed-rate periodic rate",
    value: "i = (1 + r/2)^(2/n) − 1",
    source: "Industry convention used by nesto and WOWA. Matches the FCAC calculator.",
    sourceUrl: "https://www.nesto.ca/calculators/mortgage-payment/",
    verifiedOn: on,
    status: "secondary",
  },
  R3: {
    id: "R3",
    title: "Variable-rate compounding",
    value: "Default in this calculator: monthly, (1 + r/12)^(12/n) − 1. Editable.",
    source: "Lender-specific. Not a federal rule.",
    sourceUrl: "https://www.nesto.ca/calculators/mortgage-payment/",
    verifiedOn: on,
    status: "unverified",
  },
  R4: {
    id: "R4",
    title: "Minimum down payment",
    value:
      "5% on the first $500,000, 10% on the portion above $500,000 up to $1,500,000, and 20% at $1,500,000 or more.",
    source: "FCAC down payment",
    sourceUrl:
      "https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html",
    verifiedOn: on,
    status: "verified",
  },
  R5: {
    id: "R5",
    title: "Insured price cap",
    value: "Default insurance requires a purchase price under $1,500,000.",
    source: "Department of Finance, December 15, 2024 reforms",
    sourceUrl:
      "https://www.canada.ca/en/department-finance/news/2024/09/delivering-the-boldest-mortgage-reforms-in-decades.html",
    verifiedOn: on,
    status: "verified",
  },
  R6: {
    id: "R6",
    title: "30-year insured amortization",
    value:
      "Allowed when a borrower is a first-time buyer or the home is a new build.",
    source: "Department of Finance and Canada Gazette",
    sourceUrl:
      "https://gazette.gc.ca/rp-pr/p2/2025/2025-03-12/html/sor-dors55-eng.html",
    verifiedOn: on,
    status: "verified",
  },
  R7: {
    id: "R7",
    title: "CMHC premium",
    value:
      "0.60% to 65% LTV, 1.70% to 75%, 2.40% to 80%, 2.80% to 85%, 3.10% to 90%, 4.00% to 95%, 4.50% to 95% with a non-traditional down payment.",
    source: "CMHC premium table",
    sourceUrl:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership-programs/premium-information-for-homeowner-and-small-rental-loans",
    verifiedOn: on,
    status: "verified",
  },
  R8: {
    id: "R8",
    title: "Longer amortization surcharge",
    value: "Add 0.20% when amortization is longer than 25 years and a premium applies.",
    source: "CMHC premium table",
    sourceUrl:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership-programs/premium-information-for-homeowner-and-small-rental-loans",
    verifiedOn: on,
    status: "verified",
  },
  R9: {
    id: "R9",
    title: "Premium versus sales tax",
    value:
      "The premium can be added to the loan. Provincial sales tax on the premium is cash at closing.",
    source: "CMHC and FCAC",
    sourceUrl:
      "https://www.canada.ca/en/financial-consumer-agency/services/mortgages/down-payment.html",
    verifiedOn: on,
    status: "verified",
  },
  R10: {
    id: "R10",
    title: "Ontario retail sales tax on insurance",
    value: "8%",
    source: "Ontario retail sales tax on insurance",
    sourceUrl: "https://www.ontario.ca/document/retail-sales-tax/insurance-and-benefits-plans",
    verifiedOn: on,
    status: "verified",
  },
  R11: {
    id: "R11",
    title: "Other insurers",
    value: "Sagen and Canada Guaranty are assumed equal to CMHC. This is not verified.",
    source: "Assumption",
    sourceUrl:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership-programs/premium-information-for-homeowner-and-small-rental-loans",
    verifiedOn: on,
    status: "unverified",
  },
  R12: {
    id: "R12",
    title: "Uninsured stress test",
    value: "Minimum qualifying rate is the greater of the contract rate plus 2 percentage points and 5.25%.",
    source: "OSFI minimum qualifying rate",
    sourceUrl:
      "https://www.osfi-bsif.gc.ca/en/supervision/financial-institutions/banks/minimum-qualifying-rate-uninsured-mortgages",
    verifiedOn: on,
    status: "verified",
  },
  R13: {
    id: "R13",
    title: "Insured stress test",
    value: "Same qualifying rate for CMHC-insured mortgages.",
    source: "CMHC, calculating GDS and TDS",
    sourceUrl:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds",
    verifiedOn: on,
    status: "verified",
  },
  R14: {
    id: "R14",
    title: "Straight switch at renewal",
    value:
      "No minimum qualifying rate on an uninsured straight switch that does not increase the loan or the amortization.",
    source: "OSFI",
    sourceUrl:
      "https://www.osfi-bsif.gc.ca/en/supervision/financial-institutions/banks/minimum-qualifying-rate-uninsured-mortgages",
    verifiedOn: on,
    status: "verified",
  },
  R15: {
    id: "R15",
    title: "Who must use the stress test",
    value: "Credit unions and other lenders outside federal regulation do not have to apply it.",
    source: "FCAC Mortgage Qualifier",
    sourceUrl:
      "https://itools-ioutils.fcac-acfc.gc.ca/MQ-HQ/MQCalc-EAPHCalc-eng.aspx",
    verifiedOn: on,
    status: "verified",
  },
  R16: {
    id: "R16",
    title: "GDS and TDS limits",
    value: "GDS 39% and TDS 44% for CMHC. Other lenders may use different limits.",
    source: "CMHC, calculating GDS and TDS",
    sourceUrl:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds",
    verifiedOn: on,
    status: "verified",
  },
  R17: {
    id: "R17",
    title: "GDS and TDS inputs",
    value:
      "Housing costs use the qualifying payment, property tax, heat, and half of condo fees. Other debts are added for TDS. Unsecured credit uses 3% of the balance each month.",
    source: "CMHC, calculating GDS and TDS",
    sourceUrl:
      "https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds",
    verifiedOn: on,
    status: "verified",
  },
  R18: {
    id: "R18",
    title: "Ontario land transfer tax",
    value:
      "0.5% to $55,000, 1% to $250,000, 1.5% to $400,000, 2% above $400,000, and 2.5% above $2,000,000 only for one or two single-family residences.",
    source: "Ontario land transfer tax",
    sourceUrl: "https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax",
    verifiedOn: on,
    status: "verified",
  },
  R19: {
    id: "R19",
    title: "Ontario first-time buyer refund",
    value: "Up to $4,000, for a Canadian citizen or permanent resident who is a first-time buyer.",
    source: "Ontario land transfer tax refunds",
    sourceUrl:
      "https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers",
    verifiedOn: on,
    status: "verified",
  },
  R20: {
    id: "R20",
    title: "Toronto MLTT, one or two single-family residences",
    value:
      "Matches Ontario through 2% to $2,000,000, then 2.5% to $3,000,000, 4.40% to $4,000,000, 5.45% to $5,000,000, 6.50% to $10,000,000, 7.55% to $20,000,000, and 8.60% above that. Rates from April 1, 2026.",
    source: "City of Toronto MLTT rates",
    sourceUrl:
      "https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/",
    verifiedOn: on,
    status: "verified",
  },
  R21: {
    id: "R21",
    title: "Toronto MLTT, other property",
    value: "0.5%, 1%, 1.5%, and 2% above $400,000. No higher brackets.",
    source: "City of Toronto MLTT rates",
    sourceUrl:
      "https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/",
    verifiedOn: on,
    status: "verified",
  },
  R22: {
    id: "R22",
    title: "Toronto first-time buyer rebate",
    value: "Up to $4,475.",
    source: "City of Toronto MLTT rebates",
    sourceUrl:
      "https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rebate-opportunities/",
    verifiedOn: on,
    status: "verified",
  },
  R23: {
    id: "R23",
    title: "Toronto MLTT admin fee",
    value: "$102.56 plus HST. Not included in this calculator.",
    source: "City of Toronto MLTT rates",
    sourceUrl:
      "https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/",
    verifiedOn: on,
    status: "verified",
  },
  R24: {
    id: "R24",
    title: "Foreign buyer taxes",
    value: "Ontario NRST 25%. Toronto MNRST 10%. Shown as a notice, not calculated.",
    source: "Ontario and the City of Toronto",
    sourceUrl: "https://www.ontario.ca/document/land-transfer-tax",
    verifiedOn: on,
    status: "verified",
  },
  R25: {
    id: "R25",
    title: "Example rate",
    value: "4.50% is an example. It is not today's rate.",
    source: "Rate sites are marketing pages. The Bank of Canada was not used as a live feed.",
    sourceUrl: "https://www.ratehub.ca/mortgage-payment-calculator",
    verifiedOn: on,
    status: "secondary",
  },
} as const satisfies Record<string, Rule>;

export const ruleList: Rule[] = Object.values(rules);

/** Caps used by the engine. */
export const ONTARIO_REBATE_CAP = 4_000;
export const TORONTO_REBATE_CAP = 4_475;
export const INSURED_PRICE_CAP = 1_500_000;
export const STRESS_FLOOR = 0.0525;
export const GDS_LIMIT = 0.39;
export const TDS_LIMIT = 0.44;
export const ONTARIO_PST = 0.08;
export const REVOLVING_FACTOR = 0.03;
export const UNINSURED_AMORT_MAX = 30;
