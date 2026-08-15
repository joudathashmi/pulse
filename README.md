# Investment Performance - Executive Pulse

Prototype front end for the Ministry of Investment FDI & GFCF performance management
programme. It demonstrates the executive view, the drill path from a headline figure down
to a source record, the in-quarter estimate, the data-quality gates, and the Ministry's own
326-metric indicator inventory.

It is a **front end against fixtures**. It is not the platform. See `docs/PROVENANCE.md`
for exactly which numbers are real and which are modelled - keep that document honest as
you build, because a prototype that blurs the line is worse than no prototype.

## Run it

```bash
npm start          # http://localhost:5173
```

No dependencies, no build step. `server.mjs` is a ~30-line static file server using only
Node built-ins. Node 18 or later.

> Open the served URL, not the file directly - the app uses ES modules and `fetch`,
> which browsers block on `file://`.

## Layout

```
public/
  index.html            shell: header, tab bar, six empty <section> mounts
  styles/
    tokens.css          ← the only file with brand colours in it
    layout.css          page shell, grid, typography
    components.css      tables, chips, meters, chains, alerts, tooltip
  js/
    main.js             boot, tab routing, view wiring
    config.js           palette, status tokens, tab list
    data/index.js       ← swap these four functions for real API calls
    lib/                dom, format, tooltip, status helpers
    charts/             sparkline, nowcast (2-series), bars (back-test)
    views/              one module per tab
    fixtures/           content that becomes API data later
  data/                 static JSON served to the data layer
tools/
  extract_inventory.py  regenerate inventory.json from the Ministry's xlsx
docs/                   provenance, architecture notes, screenshots
```

## Where to start

| You want to… | Go to |
|---|---|
| Point it at a real API | `js/data/index.js` - four functions, nothing else changes |
| Change brand colours | `styles/tokens.css` (and read the warning in `js/config.js`) |
| Add a tab | `js/config.js` `TABS`, a `<section id="v-…">` in `index.html`, a module in `js/views/` |
| Add a chart | `js/charts/` - follow the specs in `docs/ARCHITECTURE.md` |
| Refresh the inventory | `npm run data -- "/path/to/20250908_Data indicators.xlsx"` |

## Conventions worth keeping

- **Status is never colour alone.** Every status chip carries an icon and a word.
- **Two-series charts carry a second encoding.** The nowcast is dashed, the official print
  solid, both directly labelled. The colour pair passed the CVD check only in the floor
  band, which is legal *with* that second encoding and not without it.
- **Every figure shows its control chain** - source, method, quality, owner, state. If a
  new view shows a number without one, it is not finished.
- **Charts ship a table view.** `<details class="tv">` beside each chart.

## Not done

Dark mode. Deep drill is wired for FDI only. No authentication, no persistence,
no server-side anything.
