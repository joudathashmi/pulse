# Roadmap

Ordered by what unblocks the most. This is a prototype operating system, not
the ministry platform.

## Done on this host

- Certified pack on the gold orb; pull / fix / tick cannot overwrite it
- Live public connectors (World Bank, Invest Saudi, misa.gov.sa) labelled as pulls
- Shared control ledger: quarantine, assign, fix, named tick
- Quality gates counted from live cases
- Desk, bell, prototype directory
- Synthetic populated nowcast and back-test (no internal MISA estimates on this URL)
- Product name: Investment Pulse Operating System
- Bilingual EN / AR chrome
- Railway production URL

## Next

1. **Ministry SSO and a real classification gate.** Directory labels are not access control.
2. **In-Kingdom host** before any real MISA estimate is loaded.
3. **Metric API.** Start at `public/js/data/index.js`. Keep views ignorant of transport.
4. **URL routing.** Tabs and drill paths should be linkable.
5. **Keyboard navigation** on the tab list (`role="tab"` is present).

## Then

6. Deep drill for GFCF below level 2 (FDI is wired further today).
7. Real certificate objects (issuer, timestamp, hash) instead of a status string.
8. Signed pack promotion as its own act (ready → orb), never automatic.
9. 326-metric live warehouse: out of scope for this slice.

## Do not

- Add a charting library. The charts here match the specs on purpose.
- Introduce a second colour system. Extend `public/styles/tokens.css`.
- Show a number without its control chain.
- Put a confidential MISA calculation into `public/data/` while the host is public.
- Auto-promote a ready case onto the gold orb.
