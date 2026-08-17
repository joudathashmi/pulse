# Architecture

Investment Pulse Operating System is a static front end plus a small Node
server. No framework, no bundler, no database.

## Shape

`server.mjs` serves `public/` and two API prefixes:

| Prefix | Module | Role |
|---|---|---|
| `/api/intake/*` | `intake-api.mjs` | Live public connectors |
| `/api/control/*` | `control-store.mjs` | Shared control ledger |

`public/js/main.js` holds `{ view, path, data }`, mounts tabs, the desk, the
bell, login, Ask Me, and the floating nav. Tabs are not URL-addressable yet.

Floating nav: Home / FDI / Alerts / More. More is a body-level sheet.

## The pack seam

`public/js/data/index.js` is the only module that knows where pack files live.
Today it `fetch`es JSON under `public/data/`. Against a future metric API, swap
those loaders. Views receive plain objects.

Intake and the control client are allowed to call `/api/*` because they are the
live path, not the certified pack. They must not write `brief.headlines`.

## Data contracts

**brief.json**: certified pack. `headlines.fdi.pulseValue` / `gfcf.pulseValue`
are the orb. Read-only to the control loop.

**inventory.json**: 326 metrics, short keys:

| key | field |
|---|---|
| `c` | Category |
| `s` | Sub-category |
| `m` | Data metric |
| `o` | Responsible entity |
| `a` | Data availability |
| `f` | Frequency |
| `w` | Gap class |
| `q` | Quality challenges |
| `sh` | Sharing mechanism |

**series.json**: `{ hist: [{p,y,q,fdi,gfcf}], cur }`, SAR bn.
**indicators-2026.json**: pack quarter rows and leading signals.
**fdi-investsaudi.json** / **fdi-history.json**: country and annual cuts.
**nowcast.json**: `{ synthetic, populated, disclaimer, path: [{w,est,lo,hi}], official, printWeek }`.
**backtest.json**: `{ synthetic, populated, disclaimer, rows: [{p,est,act,err}] }`.
`loadAll()` unwraps `backtest.rows` so charts still see an array.

**control-ledger.json** (runtime, not in git): `{ cases, updatedAt }`.

## Control API

| Method | Path | Body |
|---|---|---|
| GET | `/api/control/cases` | - |
| POST | `/api/control/cases` | `{ cases: [...] }` upsert |
| POST | `/api/control/cases/:id/assign` | `{ assignee, by }` |
| POST | `/api/control/cases/:id/fix` | `{ note, mapping, evidence, proposed, by, byName }` |
| POST | `/api/control/cases/:id/tick` | `{ status: approved\|returned, note, by, byName }` |

Client: `public/js/lib/control.js`. If the API is down, the same operations
write `localStorage` key `misa-pulse-control-v1`.

## Auth (prototype)

`public/js/lib/session.js`: seeded directory, `localStorage` session. Not SSO.
Clearance is a label. See `docs/GOVERNANCE.md`.

## Chart specs

Fixed across every chart:

- Line 2px, round join and cap. Markers r ≥ 4 with a 2px surface ring.
- Columns ≤ 24px, 4px rounded cap, square at the baseline.
- Area fill at ~10% opacity.
- Gridlines hairline, solid. Never dashed.
- Label endpoint or extreme, never every point.
- Text uses text tokens, never the series colour.
- A legend for two or more series.

The two-series pair (`#16845B` estimate, `#B4543E` official) needs dash +
direct labels because CVD separation sits in the floor band. If you change
either colour, re-validate before shipping.

Status colours are reserved. Never reuse them for a series.

## Accessibility

- Status: icon + word, never colour alone.
- Charts: `role="img"` plus a table in `<details>`.
- Tabs: `role="tab"` and `aria-selected`. Arrow-key tab walking is not done.
- Synthetic estimates: visible badge and sentence, not colour alone.

## Cache

`public/index.html` query-strings CSS and `main.js` (`?v=`). Bump those when
you change styles or the boot module. The server sends `cache-control: no-store`.
