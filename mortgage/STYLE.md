# Mortgage calculator style guide

**Direction:** calm, trustworthy Canadian fintech. Warm off-white, one deep green, generous whitespace, and numbers that are the hero: big, tabular, and never jumpy. It should feel like Wealthsimple explaining your mortgage with Stripe-level clarity. No decoration that isn't information.

## References (all checked live, 2026-10-11)
| Site | Borrow |
|---|---|
| https://www.wealthsimple.com/en-ca | Calm editorial serif headlines over a clean sans, soft neutral background, very few colours |
| https://stripe.com | Clear information hierarchy, precise grids, numbers and labels with tight, consistent alignment |
| https://www.ratehub.ca/mortgage-payment-calculator | The Canadian calculator pattern: inputs on one side, live payment summary and breakdown on the other, CMHC shown explicitly |

## Fonts (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```
- Headings and the big payment number: **Fraunces** 500–600 (optical size auto). Everything else: **Inter** 400 body, 500 labels, 600 values.
- All numbers: `font-variant-numeric: tabular-nums;` (Inter supports it) so digits don't shift while the payment animates. For the big number in Fraunces, also set `tabular-nums lining-nums`.
- Type scale:

| Token | Size | Use |
|---|---|---|
| `--fs-xs` | 0.8125rem (13px) | helper text, footnotes |
| `--fs-sm` | 0.875rem (14px) | input labels (Inter 500) |
| `--fs-base` | 1rem (16px) | body, inputs (never below 16px: stops iOS zoom) |
| `--fs-lg` | 1.25rem (20px) | breakdown values |
| `--fs-xl` | 1.75rem (28px) | section headings |
| `--fs-hero` | clamp(2.75rem, 9vw, 4.5rem) | monthly payment figure, line-height 1 |
| `--fs-title` | clamp(2rem, 5vw, 3rem) | page title |

## Colour tokens (WCAG contrast computed)
| Token | Hex | Role |
|---|---|---|
| `--bg` | #F7F7F4 | page |
| `--surface` | #FFFFFF | input card, result card |
| `--surface-tint` | #E7F1EC | result panel / selected segment |
| `--text` | #1A1D1F | text, numbers |
| `--muted` | #5C6166 | labels, helper text |
| `--line` | #E3E3DD | dividers (decorative) |
| `--line-input` | #8A8F94 | input borders (3.26:1 on white, passes 3:1 UI) |
| `--primary` | #135E4B | buttons, focus, selected state, principal in chart |
| `--accent` | #C9A227 | interest slice in chart (non-text only) |
| `--success` | #1E7F4F | "you qualify" / valid |
| `--warning-ink` / `--warning-bg` | #8A6100 / #FFF8E6 | CMHC / min-down notices |
| `--error` | #B42318 | invalid input, "not insurable" |

| Pair | Ratio | AA |
|---|---|---|
| text on bg | 15.79 | ✅ |
| text on surface | 16.94 | ✅ |
| muted on bg / surface | 5.83 / 6.26 | ✅ |
| white on primary (button) | 7.69 | ✅ AAA |
| primary on surface (links) | 7.69 | ✅ |
| primary on bg | 7.17 | ✅ |
| primary on surface-tint | 6.66 | ✅ |
| text on surface-tint | 14.68 | ✅ |
| success on white | 5.00 | ✅ |
| error on white | 6.57 | ✅ |
| warning-ink on warning-bg | 5.23 | ✅ |

`--accent` gold is chart fill only; never text. Pair every colour signal with a word or icon (e.g. "Not insurable" + icon), not colour alone.

## Spacing, radius, shadow
- Spacing (4px base): 4, 8, 12, 16, 20, 24, 32, 48, 64 → `--s-1`…`--s-9`.
- Field rhythm: label → 6px → input (48px tall) → 6px → helper; 20px between fields; 32px between groups.
- Radius: `--r-sm` 8px (inputs, segmented control), `--r-md` 14px (cards), `--r-pill` 999px (chips only).
- Shadow (barely there): `--shadow-card: 0 1px 2px rgb(26 29 31 / .04), 0 4px 16px rgb(26 29 31 / .06)`. Use a 1px `--line` border on cards, not heavy shadows.

## Layout
- **390px mobile:** 20px gutters. Order: title → **result card first** (payment figure + frequency + one-line summary "on a $640,000 mortgage") → inputs → breakdown (principal, CMHC, total interest) → share button. Make the result card sticky in a compact form (64px bar with payment only) once the user scrolls into the inputs. Payment frequency as a segmented control that wraps to 2×2 if needed. Inputs are full width; currency prefix "$" inside the field; `inputmode="decimal"`.
- **Desktop (≥960px):** max width 1080px. Two columns: inputs 7/12 on the left, result card 5/12 on the right, `position: sticky; top: 24px`. Breakdown and amortization chart below, full width.
- Format all money with `Intl.NumberFormat('en-CA', {style:'currency', currency:'CAD'})`; percentages with 2 decimals.
- Small footnote under results: "Canadian semi-annual compounding. Estimates only."

## Motion
- Durations: `--dur-fast` 120ms (focus, hover), `--dur-base` 200ms (segment switch, notices), `--dur-count` 400ms (payment number).
- Easing: `--ease-out: cubic-bezier(.2,.8,.2,1)`; standard `cubic-bezier(.4,0,.2,1)` for layout.
- What moves: the payment figure tweens from old to new value in **≤ 400ms** (the current ~2s count is too long and makes the tool feel slow). Segmented control indicator slides 200ms. Notices (CMHC, min-down) fade/slide in 8px. Chart segments resize 300ms.
- Use `aria-live="polite"` on a visually hidden copy of the final value, not on the animating number.
- `prefers-reduced-motion: reduce`: the number swaps instantly; no slides; only ≤120ms opacity fades.

## Do / don't
- **Do** keep the payment number the single largest thing on screen; everything else supports it.
- **Do** use tabular numerals everywhere money appears, right-aligned in breakdown rows.
- **Do** show CMHC premium and "minimum down" logic as plain-language notices in `--warning` style, not hidden in a tooltip.
- **Don't** use more than one saturated colour (green). No gradients, no glassmorphism, no stock photos of houses.
- **Don't** animate on every keystroke; debounce input ~150ms before recalculating the tween.

## :root tokens
```css
:root {
  --font-display: "Fraunces", Georgia, "Times New Roman", serif;
  --font-body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --fs-xs: .8125rem; --fs-sm: .875rem; --fs-base: 1rem; --fs-lg: 1.25rem; --fs-xl: 1.75rem;
  --fs-title: clamp(2rem, 5vw, 3rem); --fs-hero: clamp(2.75rem, 9vw, 4.5rem);

  --bg: #F7F7F4; --surface: #FFFFFF; --surface-tint: #E7F1EC;
  --text: #1A1D1F; --muted: #5C6166; --line: #E3E3DD; --line-input: #8A8F94;
  --primary: #135E4B; --accent: #C9A227;
  --success: #1E7F4F; --warning-ink: #8A6100; --warning-bg: #FFF8E6; --error: #B42318;
  --focus: 0 0 0 3px var(--surface), 0 0 0 5px var(--primary);

  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px;
  --s-6: 24px; --s-7: 32px; --s-8: 48px; --s-9: 64px;
  --r-sm: 8px; --r-md: 14px; --r-pill: 999px;
  --shadow-card: 0 1px 2px rgb(26 29 31 / .04), 0 4px 16px rgb(26 29 31 / .06);

  --dur-fast: 120ms; --dur-base: 200ms; --dur-count: 400ms;
  --ease-out: cubic-bezier(.2, .8, .2, 1);
  --ease-standard: cubic-bezier(.4, 0, .2, 1);
  --maxw: 1080px;
}
body { font-feature-settings: "tnum" 1; }
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 120ms; --dur-count: 0ms; }
}
```

## Simplified layout v2 (Oct 14)
Charlie's feedback: too much text. Goal: understood at a glance, usable in under 1 minute. This section overrides the Layout section above; tokens stay the same.

**What I checked at Wealthsimple (2026-10-14):** `wealthsimple.com/en-ca/tool/mortgage-calculator` returns 404, and their help centre lists only RRSP, TFSA, retirement, and income tax calculators, so there is no Wealthsimple mortgage calculator to copy. What their live calculators show (`/tool/tfsa-calculator`, `/tool/tax-calculator`): a title, one sentence of intro, a short stack of labelled inputs, a frequency choice as plain words (Weekly / Bi-weekly / Monthly / Annually), results as a few label + number pairs, and assumptions pushed below under "Our assumptions". Borrow that restraint, not a specific mortgage UI.

### Above the fold: only this
1. Title: **Mortgage calculator** (no subtitle paragraph).
2. Big payment: `$3,542` + `/month` (cents dropped in the hero; full cents in details).
3. Breakdown line (one line, muted). No insurance: `Principal + interest on $640,000`. With insurance: `Principal + interest on $245,000 · incl. $9,800 CMHC` (premium amount only; detail lives in See details).
4. Frequency toggle: `Monthly | Bi-weekly | Accel. bi-weekly | Weekly`. Hero suffix changes to `/2 weeks`, `/week`.
5. Four inputs, each = label + editable number + slider:
   - `Home price` — $ field, slider $100k–$2M, step $5k.
   - `Down payment` — $ field **and** % field linked, slider 0–100% of price, step 0.5%.
   - `Interest rate` — % field, slider 0–10%, step 0.05%.
   - `Amortization` — `25 yrs`, slider 5–30, step 1 (or segmented 15/20/25/30).
6. Inline warning (only when triggered, directly under Down payment, `--warning` style): `Minimum down is $55,000.` / `Not insurable at $1.5M+. Need 20% down.`
7. Link-button: `See details ▾`.

Copy budget: besides input labels and toggle words, visible text ≤ 25 words (title 2 + breakdown ~8 + warning ≤ 8 + "See details" 2).

Inputs: native `<input type="range">` paired with `<input inputmode="decimal">`; both update each other. Arrow keys ±1 step, Shift+Arrow ±10 steps, PageUp/PageDown ±10%. Slider `aria-valuetext="$800,000"`. Number fields commit on blur/Enter and clamp with an inline message, never silently.

### 390px wireframe
```
┌──────────────────────────────┐
│ Mortgage calculator          │
│                              │
│ $3,542 /month                │  ← --fs-hero, Fraunces
│ Principal + interest on $640k│  ← muted, 1 line
│ [Monthly|Bi-wk|Accel|Weekly] │  ← segmented, scrolls if needed
├──────────────────────────────┤
│ Home price        [$800,000] │
│ ●━━━━━━━━━━━━━━━━○───────────│
│ Down payment [$160,000][20%] │
│ ●━━━━━━○─────────────────────│
│ ⚠ Minimum down is $55,000.  │  ← only if below
│ Interest rate        [4.79%] │
│ ●━━━━━━━━━━━○────────────────│
│ Amortization         [25 yrs]│
│ ●━━━━━━━━━━━━━━━━━━━○────────│
│                              │
│ See details ▾                │
└──────────────────────────────┘
```
Fits in ~780px; the payment stays visible while dragging the first inputs. Once scrolled past, show the 56px sticky bar `$3,542/mo` from v1.

### Desktop (≥960px) wireframe
```
┌───────────────────────────────────────────────────────────────┐
│ Mortgage calculator                                           │
│                                                               │
│ Home price                 [$800,000] │  $3,542 /month        │
│ ●━━━━━━━━━━━━━━━━━━━━○─────────────── │  P+I on $640,000       │
│ Down payment       [$160,000] [20%]   │                        │
│ ●━━━━━━━○──────────────────────────── │  [Monthly|Bi-weekly|   │
│ Interest rate                 [4.79%] │   Accel.|Weekly]       │
│ ●━━━━━━━━━━━━○─────────────────────── │                        │
│ Amortization                 [25 yrs] │                        │
│ ●━━━━━━━━━━━━━━━━━━━━━━○───────────── │                        │
│                                                               │
│ See details ▾                                                 │
└───────────────────────────────────────────────────────────────┘
```
Inputs 7/12 left, result 5/12 right, sticky. Max width 960px (narrower than v1's 1080px).

### Inside "See details" (collapsed `<details>` accordions, all closed by default)
- `Mortgage insurance (CMHC)` — premium %, amount, why.
- `Land transfer tax`
- `Cash to close`
- `Can I qualify?` — stress test / income estimate.
- `At renewal`
- `Payment breakdown chart`
- `Year-by-year`
- `How we calculate` — "Canadian semi-annual compounding. Estimates only." moves here.
- `Share this scenario` — copy-link button.

### Delete or move
- **Delete:** intro/explainer paragraphs above the inputs; helper text under every input; any mortgage-amount sentence except the one breakdown line; any repeated payment number outside the hero; tooltips that restate labels.
- **Move into details:** CMHC notice paragraph (keep only the one-line inline warning), principal/interest/total-interest breakdown rows, chart, amortization table, footnote, share button.
- **Speed:** payment tween stays ≤ 400ms (v1 rule); during slider drag, update instantly with no tween.

### Acceptance (matches DailyTester's plan)
- A first-time user changes all four inputs and reads the payment in < 60s on 390px and desktop.
- Regression numbers unchanged: $800k, 20% down, 25 yrs → $3,542.23 (details shows cents); min down $55k → $4,288.31.
- Below-minimum warning visible on the first screen without opening details.
