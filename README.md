# Nimble Item Piles Support

Nimble Item Piles Support is a small compatibility module that adds **Nimble v2** system integration settings for the [Item Piles](https://foundryvtt.com/packages/item-piles) module in Foundry VTT.

It does not replace Item Piles. It only teaches Item Piles how Nimble stores item quantities, item prices, currencies, and default pile actor data.

## Requirements

- Foundry VTT v13
- Nimble v2 system
- Item Piles 3.2.8 or later

## What this module configures

### Actor type

New item pile actors use Nimble `npc` actors.

### Item support

Nimble stores adventuring gear, weapons, armor, consumables, and loot as `object` items.

Configured item paths:

- Quantity: `system.quantity`
- Price value: `system.price.value`
- Price denomination: `system.price.denomination`

Blocked pile item types:

- `ancestry`
- `background`
- `boon`
- `class`
- `feature`
- `monsterFeature`
- `spell`
- `subclass`

### Currency support

Configured currency paths:

- Gold: `system.currency.gp.value`
- Silver: `system.currency.sp.value`
- Copper: `system.currency.cp.value`

Gold is treated as the primary currency. Silver and copper prices are converted into gold units for Item Piles price calculations.

## Installation

1. Download the latest release zip.
2. Extract the folder into your Foundry `Data/modules/` directory.
3. Restart Foundry.
4. Enable **Item Piles**.
5. Enable **Nimble Item Piles Support**.
6. Open a Nimble world and test by dragging a Nimble `object` item onto the scene.

The new item pile should be created as a Nimble `npc` actor, not a `character` actor.

## Updating Item Piles settings

If you previously experimented with custom Item Piles settings in a Nimble world, go to:

```text
Configure Settings → Item Piles → Configure Module → System Specific Settings
```

Then reset or review the system-specific settings after enabling this module.

## Performance and safety notes

This module is intentionally minimal:

- No canvas hooks
- No scene-wide token scans
- No actor or token patching
- No startup world-data migrations
- No repeated setting writes
- No intervals or render hooks

All integration is handled through Item Piles' system integration API.

## Current limitations

- This module has been tested against a Nimble world using standard `object` item drops and currency paths.
- It does not add a custom Item Piles UI.
