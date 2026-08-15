# Architecture notes

## Shape

A static front end with no framework and no build step. Six views mount into six
`<section>` elements; `main.js` toggles visibility and holds a small `state` object
(`view`, `path`, `data`). There is no router - tabs are not URL-addressable yet. If you
add deep-linking, put it in `main.js` and keep the views ignorant of it.

## The seam that matters

`js/data/index.js` is the only module that knows where data comes from. Today:

```js
export const loadInventory = () => get('./data/inventory.json');
```

Against the platform this becomes a call to the metric API. Views receive plain objects
and do not know the difference. Keep it that way - if a view starts calling `fetch`,
the seam is gone.

## Data contracts

**inventory.json** - array of records, short keys for transport:

| key | field |
|---|---|
| `c` | Category |
| `s` | Sub-category (use case) |
| `m` | Data metric |
| `o` | Responsible entity |
| `a` | Data availability |
| `f` | Frequency available |
| `w` | Whitespace area (gap classification) |
| `q` | Quality challenges |
| `sh` | Sharing mechanism |

**series.json** - `{ hist: [{p,y,q,fdi,gfcf}], cur: {…} }`, values in SAR bn.
**nowcast.json** - `{ path: [{w,est,lo,hi}], official, printWeek }`, `w` = week of quarter.
**backtest.json** - `[{p,est,act,err}]`, `err` = absolute percentage error.

## Chart specs

Fixed across every chart, so they read as one system:

- Line 2px, round join and cap. Markers r ≥ 4 with a 2px surface ring.
- Columns ≤ 24px, 4px rounded cap, square at the baseline.
- Area fill at ~10% opacity - a wash, never a block.
- Gridlines hairline, solid, one step off the surface. Never dashed.
- Label selectively: endpoint or extreme, never a value on every point.
- Text wears text tokens, never the series colour.
- A legend for two or more series; none for one (the title names it).

## Colour

`styles/tokens.css` owns the brand. `js/config.js` mirrors the few values charts need.

The two-series pair (`#0E8C68` estimate, `#B4543E` official) was checked with the dataviz
palette validator: lightness, chroma, normal-vision separation and contrast all pass; CVD
separation lands in the 6–8 floor band. That band is only acceptable with a second
encoding, which is why the two lines differ in dash pattern and carry direct labels.
**If you change either colour, re-run the validator before shipping.**

Status colours are a reserved set and must never be reused for a data series.

## Accessibility

- Status: icon + word, never colour alone.
- Charts: `role="img"` with a descriptive `aria-label`, plus a table view in `<details>`.
- Filters and search inputs carry `aria-label`.
- Tabs use `role="tab"` and `aria-selected`. Keyboard arrow-key navigation is not
  implemented yet - worth adding.
