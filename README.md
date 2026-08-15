# Investment Pulse Operating System

Prototype operating system for the Ministry of Investment (MISA) FDI and GFCF
performance pack. Short name in the header: **Pulse OS**.

It is a desk, not a warehouse. A machine can pull a public feed. A named person
certifies. The gold orb is the signed pack. A pull, a fix, or a tick never
overwrites that print.

Live: [https://pulse-production-1e99.up.railway.app](https://pulse-production-1e99.up.railway.app)

Source: [https://github.com/joudathashmi/pulse](https://github.com/joudathashmi/pulse)

## What it is

- **Home** — certified FDI / GFCF orb, monitors, work counts, pack explorer.
- **FDI** — immediate-country map from the public Invest Saudi feed.
- **Intake** — live pull of World Bank, investsaudi.sa/fdi, and misa.gov.sa. Failed
  values become shared control cases.
- **Quality** — six IMF DQAF gates counted from those live cases.
- **Alerts / desk / bell** — quarantine, assign, fix with evidence, then a named tick.
- **Nowcast** — in-quarter path. On this hosted prototype the path is **synthetic
  and populated**. It is not a MISA calculation.

Sign in with a first name from the prototype directory and password `Pulse2026`
(Rana, Saad, Noura, Yousef, Najd, and the other seeded desks). This is not
ministry SSO.

## Run it

```bash
npm start          # http://localhost:5173
```

Node 18 or later. No install step is required. `server.mjs` serves `public/` and
exposes `/api/intake/*` and `/api/control/*`.

Open the served URL, not the file. The app uses ES modules and `fetch`.

## Documentation

| Document | What it covers |
|---|---|
| [docs/PROVENANCE.md](docs/PROVENANCE.md) | Which numbers are public, pack, modelled, or synthetic |
| [docs/GOVERNANCE.md](docs/GOVERNANCE.md) | Consent, confidentiality, what must never be overwritten |
| [docs/CONTROL.md](docs/CONTROL.md) | Fail → quarantine → assign → fix → tick |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Server, data seam, charts, control ledger |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Sign-in, deploy, Railway, GitHub |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Done, next, and what not to add |

## Layout

```
server.mjs              static files + intake API + control API
control-store.mjs       shared KPI control ledger (JSON file)
intake-api.mjs          World Bank, Invest Saudi, misa.gov.sa connectors
data/control-ledger.json  runtime queue (not committed)
public/
  index.html
  styles/               tokens, layout, components, desk, float
  js/
    main.js             boot, tabs, desk, bell
    data/index.js       pack loaders (swap for a metric API later)
    lib/control.js      client ledger (API, localStorage fallback)
    views/              one module per surface
    fixtures/           copy and seed content
  data/                 static JSON served to the board
docs/                   this documentation
tools/                  inventory and brief ingest scripts
```

## Rules that do not change

- Status is never colour alone. Every chip has an icon and a word.
- Two-series charts carry a second encoding (dash + label), not colour alone.
- Every figure shows source, method, quality, owner, state.
- Charts ship a table view.
- Public pulls stay labelled as a direct pull.
- Internal MISA estimates are not hosted here. The nowcast is synthetic and said so.
- `brief.headlines` is never written by a pull, a fix, or a tick.

## Where to start

| You want to… | Go to |
|---|---|
| Point the pack at a real API | `public/js/data/index.js` |
| Change brand colours | `public/styles/tokens.css` |
| Add a tab | `public/js/config.js` `TAB_IDS`, a `<section>` in `index.html`, a view module |
| Understand a number’s origin | `docs/PROVENANCE.md` |
| Change how a case is born | `public/js/views/intake.js` and `control-store.mjs` |
| Refresh the inventory | `npm run data -- "/path/to/20250908_Data indicators.xlsx"` |
