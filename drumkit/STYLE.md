# DrumKit style guide

**Direction:** a tactile hardware instrument on a dark stage. Pads look like real rubber buttons with crisp mono key labels, one hot orange for hits, and instant visual feedback that feels like pressing a Teenage Engineering device. The kit is the whole page; nothing competes with it.

## References (all checked live, 2026-10-11)
| Site | Borrow |
|---|---|
| https://teenage.engineering/products/po | Hardware-as-UI: small mono labels, grid of square keys, one orange accent, lots of restraint |
| https://learningmusic.ableton.com/make-beats/make-beats.html | Clear playable pads/grid, immediate light-up on hit, friendly teaching copy |
| https://www.patatap.com | Full-screen keyboard instrument where every key gives a bold, instant visual burst |

## Fonts (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
```
- Title / pad names: **Space Grotesk** 500–700. Key labels, hints, BPM-style readouts: **JetBrains Mono** 500/700, uppercase, letter-spacing 0.08em.
- Type scale:

| Token | Size | Use |
|---|---|---|
| `--fs-xs` | 0.75rem (12px) | pad sound name (mono, uppercase) |
| `--fs-sm` | 0.875rem (14px) | hints, footer |
| `--fs-base` | 1rem (16px) | body |
| `--fs-key` | clamp(1.5rem, 5vw, 2.25rem) | key letter on pad (mono 700) |
| `--fs-title` | clamp(1.75rem, 5vw, 3rem) | page title, line-height 1, letter-spacing -0.02em |

## Colour tokens (WCAG contrast computed)
| Token | Hex | Role |
|---|---|---|
| `--bg` | #121214 | stage |
| `--surface` | #1C1C21 | kit chassis / panel |
| `--pad` | #2A2A31 | pad at rest |
| `--pad-edge` | #3A3A44 | pad bottom edge / border |
| `--text` | #F2EFEA | labels |
| `--muted` | #A3A0A8 | secondary labels, hints |
| `--primary` | #FF6A1A | hit flash, focus ring, active state |
| `--accent` | #3DD6C6 | cymbal/hi-hat family tint, secondary highlight |
| `--success` | #4ADE80 | "audio ready" dot |
| `--error` | #FF7A7A | "tap to enable sound" / load errors |

| Pair | Ratio | AA |
|---|---|---|
| text on bg | 16.31 | ✅ |
| text on surface | 14.80 | ✅ |
| text on pad | 12.42 | ✅ |
| muted on bg / surface / pad | 7.26 / 6.59 / 5.53 | ✅ |
| bg (#121214) on primary (lit pad label) | 6.53 | ✅ |
| primary on bg (text / focus ring) | 6.53 | ✅ |
| primary on pad (focus ring, 3:1 UI) | 4.97 | ✅ |
| bg on accent | 10.36 | ✅ |
| success on bg | 10.74 | ✅ |
| error on bg | 7.41 | ✅ |

When a pad lights up, switch its label to `--bg` (dark) rather than keeping light text on orange.

## Spacing, radius, shadow
- Spacing (4px base): 4, 8, 12, 16, 24, 32, 48, 64 → `--s-1`…`--s-8`.
- Pad gap: 12px mobile, 16px desktop. Chassis padding 16px mobile, 24px desktop.
- Radius: `--r-pad` 16px, `--r-chassis` 28px, `--r-chip` 6px (key caps in hints).
- Shadows (tactile, not floaty):
  - pad rest: `inset 0 1px 0 rgb(255 255 255 / .06), 0 4px 0 var(--pad-edge), 0 8px 16px rgb(0 0 0 / .35)`
  - pad hit: `translateY(3px)`, shadow `0 1px 0 var(--pad-edge), 0 0 0 2px var(--primary), 0 0 32px rgb(255 106 26 / .45)`
  - chassis: `0 24px 60px rgb(0 0 0 / .5)`

## Layout
- **390px mobile:** title + one-line hint at top ("tap a pad" on touch, "press W A S D J K L" on keyboard; detect with `matchMedia('(hover: hover) and (pointer: fine)')`). Pads in a 2-column grid, 7th pad (L) spans both columns, or a 3-3-1 layout; each pad ≥ 96px tall, square-ish. Kit fills the viewport height (`min-height: 100dvh`), no scroll needed. Disable double-tap zoom on pads: `touch-action: manipulation`.
- **Desktop (≥768px):** chassis centred, max-width 880px. Pads mirror keyboard position: row 1 W A S D (4 cols), row 2 J K L (3 cols, centred), so the screen maps to the hands. Key letter big in the pad centre, sound name small mono at the bottom-left.
- Give every pad an `aria-label` ("Kick, key K"), and use `pointerdown` (not click) for zero latency.

## Motion
- Durations: `--dur-hit` 60ms (press in), `--dur-release` 180ms (spring back + glow fade), `--dur-ui` 200ms.
- Easing: press `cubic-bezier(.3,0,.5,1)`; release `cubic-bezier(.2,.8,.2,1)`.
- What moves: only pads. Hit = translateY 3px + orange glow + label colour swap; release fades over 180ms. Optional: a 2px orange ring that expands 1→1.15 and fades over 240ms. Animate only `transform`, `opacity`, `box-shadow`.
- No idle animation, no background visualisers.
- `prefers-reduced-motion: reduce`: no translate or ring; the hit is a colour change only (pad background → `--primary`) for 120ms. Sound always plays.

## Do / don't
- **Do** make the visual hit appear on `pointerdown` / `keydown`, in the same frame as the sound.
- **Do** keep one accent (orange). Teal only to group cymbals, never as a second "hit" colour.
- **Do** show the keyboard hint only on devices with a keyboard; touch users see "tap".
- **Don't** use photos of drums or skeuomorphic textures; flat pads with depth from shadow only.
- **Don't** add a hover effect that looks like a hit; hover is at most a +4% lighter pad.

## :root tokens
```css
:root {
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --fs-xs: .75rem; --fs-sm: .875rem; --fs-base: 1rem;
  --fs-key: clamp(1.5rem, 5vw, 2.25rem); --fs-title: clamp(1.75rem, 5vw, 3rem);

  --bg: #121214; --surface: #1C1C21; --pad: #2A2A31; --pad-edge: #3A3A44;
  --text: #F2EFEA; --muted: #A3A0A8;
  --primary: #FF6A1A; --accent: #3DD6C6; --success: #4ADE80; --error: #FF7A7A;
  --focus: 0 0 0 2px var(--bg), 0 0 0 4px var(--primary);

  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px;
  --s-6: 32px; --s-7: 48px; --s-8: 64px;
  --r-chip: 6px; --r-pad: 16px; --r-chassis: 28px;
  --shadow-pad: inset 0 1px 0 rgb(255 255 255 / .06), 0 4px 0 var(--pad-edge), 0 8px 16px rgb(0 0 0 / .35);
  --shadow-hit: 0 1px 0 var(--pad-edge), 0 0 0 2px var(--primary), 0 0 32px rgb(255 106 26 / .45);
  --shadow-chassis: 0 24px 60px rgb(0 0 0 / .5);

  --dur-hit: 60ms; --dur-release: 180ms; --dur-ui: 200ms;
  --ease-press: cubic-bezier(.3, 0, .5, 1);
  --ease-out: cubic-bezier(.2, .8, .2, 1);
  --maxw: 880px;
  color-scheme: dark;
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-hit: 0ms; --dur-release: 120ms; }
  .pad.is-hit { transform: none; background: var(--primary); color: var(--bg); }
}
```
