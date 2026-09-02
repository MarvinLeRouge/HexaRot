[🇫🇷 Version française](design-system.fr.md) | 🇬🇧 English version

---

# Design system

This document describes the current visual language of the HexaRot frontend, as
it exists in `frontend/src/style.css`. It is a snapshot of the design tokens and
patterns in use, not a finalized spec: several items are still in flux (see
[In flux](#in-flux) below).

## Design tokens

Tokens are defined as CSS custom properties on `:root`, with a
`prefers-color-scheme: dark` override block for dark mode.

### Colour

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--text` | `#6b6375` | `#9ca3af` | Body text |
| `--text-h` | `#08060d` | `#f3f4f6` | Headings, high-contrast text |
| `--text-muted` | `#756d80` | `#8890a0` | Secondary text |
| `--bg` | `#fff` | `#16171d` | Page background |
| `--border` | `#8d8a92` | `#6f6d78` | Default borders |
| `--code-bg` | `#f4f3ec` | `#1f2028` | Code blocks, disabled surfaces |
| `--accent` | `#aa3bff` | `#c084fc` | Primary action colour |
| `--accent-bg` | `rgba(170, 59, 255, 0.1)` | `rgba(192, 132, 252, 0.15)` | Accent-tinted backgrounds |
| `--accent-border` | `rgba(170, 59, 255, 0.5)` | `rgba(192, 132, 252, 0.5)` | Accent-tinted borders |
| `--accent-contrast` | `#08060d` | `#08060d` | Text on top of `--accent` |
| `--danger` | `#c0392b` | `#f87171` | Errors |
| `--warning-border` | `#b45309` | `#fbbf24` | Warning borders |
| `--warning-bg` | `rgba(180, 83, 9, 0.08)` | `rgba(251, 191, 36, 0.12)` | Warning backgrounds |
| `--shadow` | soft dual-layer drop shadow | darker equivalent | Elevated surfaces |

### Typography

- `--sans` / `--heading`: `system-ui, 'Segoe UI', Roboto, sans-serif`
- `--mono`: `ui-monospace, Consolas, monospace` (used for `code`)
- Base size: `18px` (`16px` under `max-width: 1024px`), `145%` line height,
  `0.18px` letter-spacing
- Headings (`h1`, `h2`): `font-weight: 500`, coloured with `--text-h`

### Layout

- `#app` is capped at `max-width: 1126px`, centred, `min-height: 100svh`
- `color-scheme: light dark` lets the browser adapt native form controls

### Interactive elements

- Focus: `:focus-visible` gets a 2px solid `--accent` outline with a 2px offset
- Buttons: `min-height: 44px` (touch-target sized), `border-radius: 4px`
- `.btn-primary`: solid `--accent` background, `--accent-contrast` text, darkens
  on hover/active via `filter: brightness()`
- `.btn-secondary`: outlined with `--border`, transparent background, switches to
  `--accent-border` / `--accent-bg` on hover
- Disabled buttons: `--code-bg` background, `--text` colour, `--border` outline,
  `cursor: not-allowed`
- Text inputs, `select`, `textarea`: 1px `--border` outline, `4px` radius,
  `8px 10px` padding

## In flux

The items below are known to be incomplete or actively evolving; treat this
document as descriptive of the current state, not as a fixed contract.

- **No centralized design-token file for consumers.** Tokens live only in
  `frontend/src/style.css`; there is no separate `tokens.css` or design-tool
  export to keep in sync.
- **Stale-result visual language is still settling.** Encode/Decode/Key views
  need to visually distinguish a "stale" result (parameters changed since the
  cryptogram was generated) from a fresh one, without destroying the previous
  result or disabling recovery actions like Copy/Download. Contrast levels for
  disabled controls in that state have been revised more than once (see
  `.impeccable/critique/` reports).
- **Dark/light theme handling relies solely on `prefers-color-scheme`.** There is
  no manual theme toggle; this is a deliberate simplification for now, not a
  final decision.
- **Result panel sizing has open questions.** The cryptogram output has been
  flagged as visually small relative to the surrounding layout on wide screens;
  no target aspect ratio or minimum size has been fixed yet.
