# Governance

Investment Pulse Operating System is a ministry desk prototype. It is hosted on
a public URL. That fact decides what may live in the repo.

## Consent

Public connector data may be pulled and shown, and must stay labelled as a
direct pull (World Bank, Invest Saudi, misa.gov.sa).

Internal estimates and Economic Affairs forecasts created by MISA calculations
are confidential to the ministry. They are not to be placed on this host. The
in-quarter path, back-test, unissued pack forecast cards, and MISA-sourced
leading signals on this prototype are **populated synthetic figures**, marked
as such in the JSON and on every screen that shows them.

A later in-Kingdom system may load real estimates. This public prototype must
not.

## The orb does not move from here

```
Pull live source → six DQAF gates
  pass → ready for a later pack
  fail → quarantine case → assign → fix with evidence → named tick
Ready ≠ on the gold orb
A person promotes a later signed pack
```

`brief.headlines` is read-only to intake, quality, the desk, and the bell.
Ready means “fit to consider for the next signed pack.”

## Classification (honest)

The directory has Public / Restricted / Confidential labels. The i18n text
mentions in-Kingdom residency. **Neither is enforced.** Anyone who can sign in
sees the same board. Railway is a public host. Do not claim otherwise in the
product.

## Sign-off

Four distinct acts sit behind a number in the operating model:

1. A value
2. A quality exception
3. A method change
4. A material deviation

This prototype records (1) and (2) on a control case: owner, assignee, failed
gates, fix evidence, and a tick (`approved` | `returned`). It does not issue a
cryptographic certificate.

## Who may tick

- Admin desks (Rana, Saad) see every open case on the bell.
- Other desks see cases they own or are assigned.
- Approve writes `ready` and a desk message.
- Return writes `held` plus the return note.

## What we will not do on this host

- Auto-promote a ready case onto the gold orb
- Store a real MISA nowcast or EA calculation in `public/data/`
- Treat a World Bank annual USD series as the Pulse quarter
- Hide the synthetic badge on the estimate
