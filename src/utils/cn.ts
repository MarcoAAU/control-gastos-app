/**
 * Concatena nombres de clase descartando los valores falsy.
 *
 * Existe para no repetir `[a, b].filter(Boolean).join(' ')` en cada componente
 * (DRY). No usamos `clsx`/`classnames`: son 500 bytes para 3 líneas, y el
 * presupuesto de bundle está reservado para Recharts.
 *
 * @example cn(styles.button, isActive && styles.active, className)
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
