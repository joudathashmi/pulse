# Provenance

Keep this file accurate. The credibility of Investment Pulse Operating System
rests on being explicit about which numbers are public, which come from a
ministry pack file, which are modelled to exercise the board, and which are
**synthetic placeholders** because this host is public.

The in-product page **What is sourced** (`public/js/fixtures/provenance.js`)
must stay in step with this document.

## Public — pulled live, and labelled as a pull

These feeds are fetched by the Node server. The browser talks only to
`/api/intake/*`. Intake states the connector, the pull time, and that the
certified Pulse is not overwritten.

| What | Source | Route |
|---|---|---|
| FDI net inflows, annual, current USD | World Bank `BX.KLT.DINV.CD.WD` | `GET /api/intake/worldbank` |
| GFCF, annual, current USD | World Bank `NE.GDI.FTOT.CD` | `GET /api/intake/worldbank` |
| Immediate-country and ISIC sector FDI, 2016–2024, SAR bn | [investsaudi.sa/fdi](https://investsaudi.sa/fdi) | `GET /api/intake/investsaudi` |
| Dissemination headlines | misa.gov.sa (scrape) | `GET /api/intake/misa` |

A snapshot of the Invest Saudi cut also lives at `public/data/fdi-investsaudi.json`
so the map works before a live pull. Country-year sums match the Inflows workbook.
Marketing headlines on that page (119 / 80 / 977) are a different rounding and
do not replace the certified Pulse.

World Bank values are annual USD. Pulse Q1 2026 is quarterly SAR bn. That
mismatch is a control case, not a conversion the machine is allowed to invent.

## Pack — loaded from ministry files, not computed here

| What | Source |
|---|---|
| 326-metric inventory | `20250908_Data indicators.xlsx`, Master data sheet, unmodified → `public/data/inventory.json` |
| Gap counts (141 no owner, 44 no sharing, 43 granularity, 1 frequency) | computed from that file at render time |
| Method stamps | IMF BPM6 / OECD BD5 for FDI, SNA 2008 for GFCF |
| Component structure | FDI equity / reinvested earnings / related-party debt; GFCF by asset type |
| Certified Pulse headlines (orb) | Indicators pack / performance brief → `public/data/brief.json` |
| 2026 issued actuals (Q1) | Indicators pack, labelled issued / GASTAT |
| 2026 forecast columns | **Replaced.** Populated synthetic figures in `indicators-2026.json`. Not EA or MISA calculations. |
| FDI stock, net, inflow 2016–2024 | `FDI_Inflows_Report_2016_2024.xlsx` → `public/data/fdi-history.json` |

The gold orb is this pack print. Refresh, intake, fix, and tick do not write
`brief.headlines`.

## Modelled — to exercise the board

| What | Why |
|---|---|
| Quarterly distribution of annual anchors to 2025 | so trend, drill and comparison have a series |
| Illustrative source-record identifiers at drill level 4 | so the four-tap path can be walked |
| Seeded alerts, inbox, and directory | so the desk can be demonstrated |

## Synthetic — populated because this host is public

Internal MISA-calculated estimates are **not** stored on this prototype.

| What | File | Honest line |
|---|---|---|
| In-quarter nowcast path and band | `public/data/nowcast.json` | `synthetic: true`. Week-13 value is a populated fake (24.6). Not a MISA calculation. |
| Back-test estimate vs actual | `public/data/backtest.json` | `synthetic: true`. Seven populated rows. Not MISA calculations. |

Every nowcast surface (Home card, Nowcast tab, glossary, Ask Me, provenance)
must keep the badge **Synthetic · populated**.

If a real MISA estimate is later required, it belongs on an approved internal
host with a classification gate. Do not put it back in these JSON files while
the system is on a public URL.

## What this prototype does not demonstrate

- A legal route to data held by other entities
- Ministry SSO or enforced clearance (labels exist; the board is not classified)
- In-Kingdom residency of the Railway host
- Lineage that would survive a formal audit
- Auto-promotion of a ready case onto the gold orb
