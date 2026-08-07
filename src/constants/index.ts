/** Punto de importación único de los catálogos y constantes. */

export { ACCOUNT_TYPE_META, DEFAULT_ACCOUNT_TYPE } from './accountTypes';
export { createDefaultSettings } from './defaultSettings';
export { ICON_REGISTRY, PICKABLE_ICONS, resolveIcon } from './icons';
export type { IconKey } from './icons';
export {
  AMOUNT_DECIMALS,
  CSV_DELIMITER,
  CURRENCY,
  CURRENCY_SYMBOL,
  LOCALE,
  WEEK_STARTS_ON,
} from './locale';
export { DEFAULT_COLOR, PALETTE } from './palette';
export {
  DASHBOARD_PERIODS,
  DEFAULT_PERIOD,
  PERIOD_COMPARISON_LABELS,
  PERIOD_LABELS,
  PERIODS,
} from './periods';
export type { Period } from './periods';
export { BOTTOM_NAV_ITEMS, buildPath, ROUTES } from './routes';
export type { RouteKey } from './routes';
export { LEGACY_MANUAL_BANK_ID, SEED_BANKS } from './seedBanks';
export type { BankSeed } from './seedBanks';
export { LEGACY_CATEGORY_IDS, SEED_CATEGORIES, SEED_SUBCATEGORIES } from './seedCategories';
export type { CategorySeed, SubcategorySeed } from './seedCategories';
export {
  BACKUP_KEY_PREFIX,
  LEGACY_STORAGE_KEY,
  MIGRATION_NOTICE_KEY,
  STORAGE_KEY,
} from './storageKeys';
export {
  SYSTEM_ACCOUNT_UNASSIGNED,
  SYSTEM_BANK_NONE,
  SYSTEM_CATEGORY_ADJUSTMENT,
  SYSTEM_CATEGORY_UNCATEGORIZED,
  SYSTEM_IDS,
} from './systemIds';
