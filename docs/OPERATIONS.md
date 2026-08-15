# Operations

## Local

```bash
cd /path/to/misa-pulse
npm start
```

Opens at http://localhost:5173. `PORT` overrides the port.

Sign in with a seeded first name and `Pulse2026`. Admin desks: Rana, Saad.
Economic Affairs: Noura, Yousef, Najd.

## Live host

Railway project `misa-pulse`, service `pulse`, environment `production`.

URL: https://pulse-production-1e99.up.railway.app

This folder is what `railway up --ci` uploads. It does not need to be a git
push to deploy. After a DNS miss to `backboard.railway.com`, ping that host
once and retry.

```bash
ping -c 1 backboard.railway.com
railway up --ci
```

`railway.toml` start command is `node server.mjs`. Health check is `/`.

The control ledger is created on first write at `data/control-ledger.json` on
the Railway volume/filesystem of that service. It is not in git. Two browsers
on the same host share it. A local run has its own file.

## GitHub

Canonical repo: https://github.com/joudathashmi/pulse

```bash
git add -A
git status
git commit -m "Why this change exists."
git push -u origin HEAD
```

Do not commit `data/control-ledger.json`, `.env`, or credentials.
`.gitignore` already excludes the ledger, `node_modules`, and logs.

## Cache after a UI change

Bump `?v=` on the stylesheets and `public/js/main.js` in `public/index.html`
so browsers pick up the new boot graph.

## Ingest

```bash
npm run data -- "/path/to/20250908_Data indicators.xlsx"
npm run ingest:brief -- "/path/to/pack.pdf"
```

Those scripts refresh `public/data/inventory.json` and the brief files. They
do not touch the gold orb unless the brief ingest is run on purpose.

## What not to host here

Real MISA-calculated estimates. See `docs/GOVERNANCE.md` and
`docs/PROVENANCE.md`. While this system is on a public server, nowcast and
back-test stay synthetic and labelled.
