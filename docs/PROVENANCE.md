# Provenance

Keep this file accurate. The credibility of the prototype rests on being explicit about
which numbers are the Ministry's and which are modelled.

## Real - loaded from Ministry files

| What | Source |
|---|---|
| 326 metrics, with category, responsible entity, availability, frequency, gap class | `20250908_Data indicators.xlsx`, *Master data sheet*, loaded unmodified |
| Gap counts: 141 no clear owner · 44 no sharing mechanism · 43 below granularity · 1 frequency | computed from that file at render time, not typed in |
| Standards: IMF BPM6 / OECD BD5 for FDI, SNA 2008 for GFCF | methodology documents |
| Component structure: FDI equity / reinvested earnings / related-party debt; GFCF by asset type | `FDI GFCF Data Dictionary EN.xlsx` |
| Annual anchors to 2025 | published FDI and GFCF figures cited in the Committee pack |
| FDI stock, net flow, inflow 2016-2024 | `FDI_Inflows_Report_2016_2024.xlsx` (identical to `FDI_WorldMap_Report_2016_2024.xlsx`), sheet Inflows. Loaded as `public/data/fdi-history.json`. |
| FDI by immediate country and sector, 2016-2024 | Public Invest Saudi dashboard `https://investsaudi.sa/fdi` (`/backend/wp-json/v3/fdi-page?X-Currency=sar`). Snapshot `public/data/fdi-investsaudi.json`; live pull `/api/intake/investsaudi`. SAR thousands converted to SAR bn. Country-year sums match the Inflows workbook. |

## Modelled - to exercise the pipeline

| What | Why |
|---|---|
| Quarterly distribution of the annual anchors | so trend, drill and comparison have something to run on |
| The running quarter (2026 Q1) | so the provisional state, the estimate and the exception queue can be shown |
| The nowcast path and confidence band | demonstrates the mechanism, says nothing about model accuracy |
| Back-test record (seven quarters) | shows that accuracy is itself tracked |
| Transaction identifiers at drill level 4 | illustrative |
| Leading-signal values, alerts, gate counts | illustrative |

## What this prototype does not demonstrate

A legal route to data held by other entities. Reconciliation to the official series.
Lineage that survives an audit. A named owner per indicator. Those are the parts that take
the programme its time, and none of them is a front-end problem.
