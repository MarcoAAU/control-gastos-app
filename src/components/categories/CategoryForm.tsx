import { useState } from 'react';
import { DEFAULT_COLOR } from '@/constants';
import type { Category, CategoryKind } from '@/models';
import { ColorPicker, Icon, IconPicker, TextField } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { CategoryDraft } from '@/store/slices/categoriesSlice';
import styles from './CategoryForm.module.css';

export interface CategoryFormProps {
  formId: string;
  /** Categoría a editar; ausente = alta. */
  category?: Category | undefined;
  onSubmit: (draft: CategoryDraft) => void;
}

const KINDS: ReadonlyArray<{ value: CategoryKind; label: string; hint: string }> = [
  { value: 'expense', label: 'Gasto', hint: 'Aparece al anotar un gasto' },
  { value: 'income', label: 'Ingreso', hint: 'Aparece al anotar un ingreso' },
  { value: 'both', label: 'Ambos', hint: 'Aparece en los dos casos' },
];

/**
 * Alta y edición de una categoría.
 *
 * ── POR QUÉ EXISTE EL TIPO "AMBOS" ────────────────────────────────────────
 * v1 tenía dos listas fijas y separadas en el código (`CATEGORIES` e
 * `INCOME_CATEGORIES`), así que una categoría era gasto o ingreso y punto —
 * y el usuario no podía crear ninguna. Hay casos reales que son las dos cosas:
 * un préstamo es ingreso cuando lo recibes y gasto cuando lo pagas. Forzar a
 * duplicar la categoría ("Préstamo recibido" / "Préstamo pagado") rompería los
 * informes por categoría, que es justo donde interesa verlas juntas.
 */
export function CategoryForm({ formId, category, onSubmit }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'expense');
  const [color, setColor] = useState(category?.color ?? DEFAULT_COLOR);
  const [icon, setIcon] = useState(category?.icon ?? 'cat-otros');
  const [error, setError] = useState<string | undefined>(undefined);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!name.trim()) {
      setError('Ponle un nombre a la categoría.');
      return;
    }
    setError(undefined);
    onSubmit({ name: name.trim(), kind, color, icon });
  }

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label="Nombre"
        value={name}
        onChange={setName}
        placeholder="p. ej. Mascotas"
        maxLength={40}
        required
        autoFocus={!category}
        {...(error ? { error } : {})}
      />

      <div>
        <div className={styles.groupLabel}>¿Dónde debe aparecer?</div>
        <div className={styles.kinds} role="radiogroup" aria-label="Tipo de categoría">
          {KINDS.map((option) => {
            const active = option.value === kind;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                className={cn(styles.kind, active && styles.kindActive)}
                onClick={() => setKind(option.value)}
              >
                <span className={styles.kindLabel}>{option.label}</span>
                <span className={styles.kindHint}>{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <IconPicker label="Icono" value={icon} onChange={setIcon} accent={color} />
      <ColorPicker label="Color" value={color} onChange={setColor} />

      {/* Vista previa: el usuario ve la combinación exacta que verá luego en
          la lista de movimientos, no una aproximación. */}
      <div className={styles.preview}>
        <span className={styles.previewLabel}>Se verá así</span>
        <span className={styles.previewChip} style={{ background: `${color}22`, color }}>
          <Icon name={icon} size="md" />
          <span className={styles.previewName}>{name.trim() || 'Sin nombre'}</span>
        </span>
      </div>
    </form>
  );
}
