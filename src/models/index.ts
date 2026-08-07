/** Punto de importación único de los tipos del dominio. */

export type {
  Archivable,
  Auditable,
  HexColor,
  IconRef,
  ID,
  ISODate,
  ISOInstant,
  ISOTime,
  TransactionSource,
  TransactionType,
} from './common';

export { ACCOUNT_TYPES } from './Account';
export type { Account, AccountType } from './Account';

export type { Bank } from './Bank';

export type { Category, CategoryKind, Subcategory } from './Category';

export type { Transaction } from './Transaction';

export type { HistoryEntry } from './HistoryEntry';

export type { AppSettings, ThemePreference } from './AppSettings';

export { CURRENT_SCHEMA_VERSION } from './AppData';
export type { AppData } from './AppData';

export { DEFAULT_SORT, EMPTY_FILTERS } from './filters';
export type { SortDirection, SortField, TransactionFilters, TransactionSort } from './filters';
