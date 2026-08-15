# KPI control loop

One shared **control case** is the object Intake, Quality, Alerts, the desk, and
the bell all read. Fail, hold, fix, and tick are one audit line.

## Case fields

| Field | Meaning |
|---|---|
| `id` | Stable id (`v-units-fdi`, `q-fdi-q2`, …) |
| `kpi`, `period`, `source` | What was pulled |
| `pulledValue`, `unit` | Live connector print |
| `pulseValue`, `pulseUnit` | Certified pack print (for comparison only) |
| `failedGates` | One or more of the six DQAF names |
| `reason` | Why it is held |
| `owner`, `assignee` | Unit and directory user |
| `status` | `held` → `in_fix` → `ready` (return goes back to `held`) |
| `fix` | note, mapping, evidence, proposed, by, at |
| `tick` | `approved` \| `returned`, by, at, note |

## Six gates

From `public/js/fixtures/quality.js`:

1. Schema and type
2. Range and plausibility
3. Completeness and freshness
4. Cross-source reconciliation
5. Anomaly detection
6. Human sign-off

Quality counts are “N held this cycle” from live cases, not a static poster.

## How a case is born

On **Pull live sources** (`public/js/views/intake.js`):

1. Run `verifyQueue()` — units/vintage (USD vs SAR, annual vs quarter), source
   hierarchy, Invest Saudi vintage, web copy as evidence, scrape issues.
2. Upsert those rows plus held pack rows from `heldPackRows()` (unissued Q2–Q4,
   empty signals, quality exceptions).
3. Paint the steward queue from the ledger.

The pull already existed. The ledger is what persists it.

## How someone fixes it

Open the case from Intake, Quality, or desk assignments
(`public/js/views/controlCase.js`):

- **Assign** sets `assignee` to a directory user.
- **Save fix** writes mapping and evidence. Status becomes `in_fix`.
- This changes the case, not the orb.

## Where the tick is

The bell (`public/js/views/approvals.js`) lists open cases for this desk
(or all cases, if admin). Approve / Return calls
`POST /api/control/cases/:id/tick` and writes a desk message.

## Where it lives

| Layer | File |
|---|---|
| Server store | `control-store.mjs` → `data/control-ledger.json` |
| Routes | `GET/POST /api/control/cases`, `…/assign`, `…/fix`, `…/tick` |
| Client | `public/js/lib/control.js` (localStorage fallback if the API is down) |

The ledger file is created on first write and is gitignored. One JSON file is
enough for this prototype and for Railway. Do not add a database in this slice.

## How to know it works

1. Sign in as Rana. Pull live sources. A units/vintage case appears on Intake,
   Quality, and the bell.
2. Assign it to Economic Affairs. Open Fix, write the mapping, save. Status is
   `in_fix`.
3. Bell: Approve with a note. Case is `ready`. The requester’s desk is messaged.
4. Home orb is still the certified pack print. Another browser on the same host
   sees the same case and the same tick.
