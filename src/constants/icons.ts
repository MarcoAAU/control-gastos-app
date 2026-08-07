/**
 * Registro de iconos: clave semántica → componente de lucide-react.
 *
 * POR QUÉ UN REGISTRO Y NO IMPORTS SUELTOS
 * Los datos guardados (categorías, cuentas, bancos) llevan un campo `icon` que
 * es un STRING persistido en localStorage. No se puede guardar un componente
 * de React en localStorage, así que hace falta una tabla clave→componente.
 *
 * COMPATIBILIDAD CON LOS DATOS DE v1 (requisito explícito del usuario)
 * v1 guardaba emojis literales ("🍔", "🏦"). La migración NO los traduce: el
 * componente <Icon> busca la clave en este registro y, si no la encuentra,
 * renderiza el string tal cual. Resultado: cero migración de iconos, cero
 * riesgo de perder el icono de una categoría del usuario, y las claves nuevas
 * conviven con los emojis antiguos. Ver ADR-011.
 *
 * COSTE
 * Al referenciar los componentes en un objeto, todos entran al bundle (no hay
 * tree-shaking posible sobre un mapa dinámico). ~55 iconos ≈ 4 kB gz. Es el
 * precio de que el icono sea un dato y no código, y está dentro del
 * presupuesto. Si creciera mucho, la salida es React.lazy por grupo.
 */

import {
  Archive,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Download,
  Filter,
  Gift,
  Heart,
  House,
  Inbox,
  Info,
  Landmark,
  Laptop,
  LayoutDashboard,
  Lock,
  Package,
  Pencil,
  PieChart,
  PiggyBank,
  Pill,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  StickyNote,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Upload,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ICON_REGISTRY = {
  // ── Categorías de gasto (equivalentes a los emojis de app.js:5-13) ──────
  'cat-comida': UtensilsCrossed,
  'cat-transporte': Car,
  'cat-vivienda': House,
  'cat-entretenimiento': Clapperboard,
  'cat-salud': Pill,
  'cat-compras': ShoppingBag,
  'cat-servicios': ReceiptText,
  'cat-otros': Package,

  // ── Categorías de ingreso (app.js:16-22) ────────────────────────────────
  'cat-salario': Briefcase,
  'cat-freelance': Laptop,
  'cat-regalo': Gift,
  'cat-inversion': TrendingUp,
  'cat-otro-ingreso': Coins,

  // ── Categorías de sistema ───────────────────────────────────────────────
  'cat-ajuste': Scale,

  // ── Bancos y tipos de cuenta ────────────────────────────────────────────
  bank: Landmark,
  'bank-office': Building2,
  'bank-nu': Heart,
  wallet: Wallet,
  card: CreditCard,
  cash: Banknote,
  savings: PiggyBank,

  // ── Navegación ──────────────────────────────────────────────────────────
  'nav-dashboard': LayoutDashboard,
  'nav-transactions': ArrowLeftRight,
  'nav-accounts': Wallet,
  'nav-tracking': TrendingUp,
  'nav-reports': PieChart,
  'nav-categories': Tags,
  'nav-history': Archive,
  'nav-settings': Settings,

  // ── Acciones ────────────────────────────────────────────────────────────
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  duplicate: Copy,
  close: X,
  check: Check,
  search: Search,
  filter: Filter,
  'filter-advanced': SlidersHorizontal,
  refresh: RefreshCw,
  export: Download,
  import: Upload,

  // ── Indicadores y metadatos ─────────────────────────────────────────────
  income: ArrowUpRight,
  expense: ArrowDownRight,
  up: TrendingUp,
  down: TrendingDown,
  calendar: Calendar,
  clock: Clock,
  note: StickyNote,
  lock: Lock,
  info: Info,
  warning: TriangleAlert,
  empty: Inbox,

  // ── Chevrones ───────────────────────────────────────────────────────────
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevron-down': ChevronDown,
} satisfies Record<string, LucideIcon>;

/** Claves conocidas del registro. Los datos pueden contener otros strings
 *  (emojis heredados de v1): por eso los modelos tipan `icon` como `string`. */
export type IconKey = keyof typeof ICON_REGISTRY;

/**
 * Iconos que se le ofrecen al usuario para sus categorías y cuentas.
 *
 * Es un SUBCONJUNTO deliberado del registro, no `Object.keys(ICON_REGISTRY)`.
 * Ofrecer los de navegación o los de acción dejaría poner una papelera o una
 * flecha de "atrás" como icono de una categoría de gasto: técnicamente
 * funciona, visualmente confunde.
 *
 * `cat-ajuste` tampoco está: es de la categoría de sistema y verlo repetido en
 * una categoría del usuario haría ilegible el historial de ajustes.
 */
export const PICKABLE_ICONS: readonly IconKey[] = [
  'cat-comida',
  'cat-transporte',
  'cat-vivienda',
  'cat-entretenimiento',
  'cat-salud',
  'cat-compras',
  'cat-servicios',
  'cat-otros',
  'cat-salario',
  'cat-freelance',
  'cat-regalo',
  'cat-inversion',
  'cat-otro-ingreso',
  'bank',
  'wallet',
  'card',
  'cash',
  'savings',
  'calendar',
  'clock',
  'note',
  'up',
  'down',
];

/** Devuelve el componente de una clave, o `undefined` si no está registrada
 *  (en cuyo caso <Icon> hace el fallback a texto literal). */
export function resolveIcon(name: string): LucideIcon | undefined {
  return (ICON_REGISTRY as Record<string, LucideIcon>)[name];
}
