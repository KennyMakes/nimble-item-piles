// ============================================================================
// Nimble Item Piles Support
// Adds Nimble v2 system-specific settings for the Item Piles module.
//
// Target stack:
// - Foundry VTT v13
// - Nimble v2 system
// - Item Piles 3.2.8+
//
// Design notes:
// - Uses Item Piles' official addSystemIntegration API.
// - Does not patch Nimble, Item Piles, actors, tokens, or canvas behavior.
// - Does not scan scene tokens or modify world data on startup.
// - Pile actors intentionally use Nimble's npc actor type, not character.
// ============================================================================

const ITEM_PILES_ID = "item-piles";
const NIMBLE_SYSTEM_ID = "nimble";
const NIMBLE_PILE_ACTOR_TYPE = "npc";
const INTEGRATION_VERSION = "0.1.0";

let registered = false;
let warnedMissingItemPiles = false;
let warnedMissingApi = false;

function prefix(message) {
  return `Nimble Item Piles Support | ${message}`;
}

function warnOnce(key, message, ...args) {
  if (key === "missingItemPiles") {
    if (warnedMissingItemPiles) return;
    warnedMissingItemPiles = true;
  }

  if (key === "missingApi") {
    if (warnedMissingApi) return;
    warnedMissingApi = true;
  }

  console.warn(prefix(message), ...args);
}

function getOwnershipLevel(key, fallback) {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.[key]
    ?? globalThis.CONST?.DOCUMENT_PERMISSION_LEVELS?.[key]
    ?? fallback;
}

function currencyByDenomination(currencies, denomination) {
  const den = String(denomination || "gp").toLowerCase().trim();

  return currencies.find((currency) => {
    const abbreviation = String(currency.abbreviation || "").toLowerCase();
    const name = String(currency.name || "").toLowerCase();
    const path = String(currency.data?.path || currency.path || "").toLowerCase();

    return abbreviation.includes(den)
      || name.endsWith(`.${den}`)
      || path.endsWith(`.${den}.value`);
  });
}

function getPriceData(item) {
  if (!item) return null;
  if (item?.system?.price) return item.system.price;

  const directPrice = foundry.utils.getProperty(item, "system.price");
  if (directPrice) return directPrice;

  const objectData = item?.toObject instanceof Function ? item.toObject() : null;
  return foundry.utils.getProperty(objectData, "system.price");
}

function getPriceValue(item, priceData, itemPriceAttribute) {
  const value = priceData?.value
    ?? foundry.utils.getProperty(item, itemPriceAttribute)
    ?? foundry.utils.getProperty(item?.toObject instanceof Function ? item.toObject() : null, itemPriceAttribute)
    ?? 0;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function nimbleItemCostTransformer(item, defaultCurrencies = [], itemPriceAttribute = "system.price.value") {
  const priceData = getPriceData(item);
  if (!priceData) return 0;

  const value = getPriceValue(item, priceData, itemPriceAttribute);
  if (value <= 0) return 0;

  const denomination = String(priceData.denomination ?? "gp").toLowerCase().trim();
  const currency = currencyByDenomination(defaultCurrencies, denomination);

  // Item Piles expects prices in units of the primary currency.
  // This integration sets gp as the primary currency, so sp and cp are
  // represented as fractions of gp.
  const fallbackExchangeRates = { gp: 1, sp: 0.1, cp: 0.01 };
  const exchangeRate = Number(currency?.exchangeRate ?? fallbackExchangeRates[denomination] ?? 1);

  return value * exchangeRate;
}

function buildNimbleItemPilesConfig() {
  return {
    VERSION: INTEGRATION_VERSION,

    // Use npc, not character. Item-pile actors are not heroes and should not be
    // discovered by player-token or PC helper macros that scan for character actors.
    ACTOR_CLASS_TYPE: NIMBLE_PILE_ACTOR_TYPE,

    // Nimble stores weapons, armor, consumables, and gear as object items.
    ITEM_CLASS_LOOT_TYPE: "object",
    ITEM_CLASS_WEAPON_TYPE: "object",
    ITEM_CLASS_EQUIPMENT_TYPE: "object",

    // Nimble object schema paths.
    ITEM_QUANTITY_ATTRIBUTE: "system.quantity",
    ITEM_PRICE_ATTRIBUTE: "system.price.value",
    QUANTITY_FOR_PRICE_ATTRIBUTE: "flags.item-piles.system.quantityForPrice",
    ITEM_PREVIEW_PERMISSION_LEVEL: getOwnershipLevel("OBSERVER", 2),

    // Item Piles item filters are disallow filters. Keep object items valid,
    // and block character-building or system-definition items from piles.
    ITEM_FILTERS: [
      {
        path: "type",
        filters: "ancestry,background,boon,class,feature,monsterFeature,spell,subclass"
      }
    ],

    // Same-name object items stack together when these key fields match.
    ITEM_SIMILARITIES: [
      "name",
      "type",
      "system.objectType",
      "system.objectSizeType",
      "system.identified"
    ],

    UNSTACKABLE_ITEM_TYPES: [],

    // Use gp as the primary currency. Item prices are converted into gp units
    // by nimbleItemCostTransformer using each item's price denomination.
    CURRENCIES: [
      {
        primary: true,
        type: "attribute",
        name: "NIMBLE.currency.gp",
        img: "icons/commodities/currency/coins-plain-stack-gold.webp",
        abbreviation: "{#} gp",
        data: { path: "system.currency.gp.value" },
        exchangeRate: 1
      },
      {
        primary: false,
        type: "attribute",
        name: "NIMBLE.currency.sp",
        img: "icons/commodities/currency/coins-plain-stack-silver.webp",
        abbreviation: "{#} sp",
        data: { path: "system.currency.sp.value" },
        exchangeRate: 0.1
      },
      {
        primary: false,
        type: "attribute",
        name: "NIMBLE.currency.cp",
        img: "icons/commodities/currency/coins-plain-stack-copper.webp",
        abbreviation: "{#} cp",
        data: { path: "system.currency.cp.value" },
        exchangeRate: 0.01
      }
    ],

    SECONDARY_CURRENCIES: [],
    CURRENCY_DECIMAL_DIGITS: 0.01,

    ITEM_COST_TRANSFORMER: nimbleItemCostTransformer,

    // Important: enabled must remain false. If enabled is true here, normal
    // Nimble actors and tokens can appear to be item piles by default.
    PILE_DEFAULTS: {
      enabled: false,
      type: "pile",
      closed: false,
      locked: false,
      displayOne: false,
      showItemName: false,
      overrideItemFilters: false,
      overrideCurrencies: false,
      overrideSecondaryCurrencies: false
    }
  };
}

function registerNimbleSupport() {
  if (registered) return;
  if (game.system?.id !== NIMBLE_SYSTEM_ID) return;

  const itemPiles = game.modules.get(ITEM_PILES_ID);
  if (!itemPiles?.active) {
    warnOnce("missingItemPiles", "Item Piles is not active. Enable Item Piles first, then enable this support module.");
    return;
  }

  const api = game.itempiles?.API;
  if (!api?.addSystemIntegration) {
    warnOnce("missingApi", "Item Piles API is not ready yet. Nimble support could not be registered.");
    return;
  }

  try {
    api.addSystemIntegration(buildNimbleItemPilesConfig(), "latest");
    registered = true;
  } catch (error) {
    console.error(prefix("Failed to register Nimble integration."), error);

    if (game.user?.isGM) {
      ui.notifications?.error("Nimble Item Piles Support failed to register. Check the console for details.");
    }
  }
}

// Preferred hook used by modern Item Piles companion modules.
Hooks.once("item-piles-ready", registerNimbleSupport);

// Safe fallback. The registered guard prevents duplicate registration.
Hooks.once("ready", registerNimbleSupport);
