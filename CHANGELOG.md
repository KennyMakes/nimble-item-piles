# Changelog

## 0.1.0

Initial public release candidate.

### Added

- Nimble v2 system integration for Item Piles.
- Nimble `object` item support for loot, weapons, armor, and equipment.
- Nimble item quantity path: `system.quantity`.
- Nimble item price path: `system.price.value`.
- Nimble gold, silver, and copper currency paths.
- Item cost transformer for gp, sp, and cp denominations.
- Default item pile actor type set to Nimble `npc`.

### Safety

- Normal Nimble actors and tokens are not item piles by default.
- No world-data migration runs on startup.
- No canvas scanning, render hooks, intervals, or actor/token monkey patches.
