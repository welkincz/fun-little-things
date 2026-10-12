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
