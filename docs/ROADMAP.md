# Prototype roadmap

Ordered by what unblocks the most.

## Next

1. **Replace fixtures with an API.** Start with `js/data/index.js`. Define the metric
   response shape first, then move `fixtures/headlines.js` and `fixtures/signals.js` behind it.
2. **URL routing.** Tabs and drill paths should be linkable - a Committee member should be
   able to be sent straight to a source record.
3. **Keyboard navigation on the tab bar.** `role="tab"` is present; arrow-key handling is not.
4. **Dark mode.** Select the steps deliberately from the same ramps and re-run the palette
   validator against the dark surface. Do not auto-invert.

## Then

5. Deep drill for GFCF (currently FDI only below level 2).
6. Real certificate objects - issuer, timestamp, hash - instead of a state string.
7. Export: the certified view to PDF and PNG, per the pack requirement.
8. Arabic layout and RTL.

## Do not

- Add a charting library. The three chart types here are 200 lines and match the specs.
- Introduce a second colour system for a new component. Extend `tokens.css`.
- Show a number without its control chain.
