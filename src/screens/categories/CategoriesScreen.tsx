import { useMemo, useState } from 'react';
import type { Category, ID, Subcategory } from '@/models';
import { Fab, ScreenContainer, TopBar } from '@/components/layout';
import { Button, Card, EmptyState, Icon, Select, Sheet, TextField } from '@/components/ui';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { CategoryItem } from '@/components/categories/CategoryItem';
import { useAppStore } from '@/store';
import { useCategories } from '@/store/hooks/useTransactions';
import { cn } from '@/utils/cn';
import styles from './CategoriesScreen.module.css';

type SheetState =
  // Hoja 1: formulario de categoría.
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; category: Category }
  // Hoja 2: detalle → subcategorías → confirmar archivado.
  | { kind: 'detail'; category: Category }
  | { kind: 'addSub'; category: Category }
  | { kind: 'editSub'; category: Category; subcategory: Subcategory }
  | { kind: 'confirmArchive'; category: Category };

const FORM_ID = 'category-form';

/**
 * Categorías y subcategorías.
 *
 * ── LO QUE v1 NO PODÍA HACER ──────────────────────────────────────────────
 * En v1 las categorías eran dos constantes en el código (`CATEGORIES` e
 * `INCOME_CATEGORIES`, `app.js:5-22`). No había ni dónde guardar una
 * categoría nueva, así que el usuario no podía crear, renombrar ni recolorear
 * ninguna. Ahora son datos.
 *
 * ── EL RIESGO DE ESTA PANTALLA: BORRAR UNA CATEGORÍA EN USO ───────────────
 * Un borrado físico dejaría cientos de movimientos apuntando a un id que ya no
 * existe: desaparecerían de los informes por categoría y su gasto dejaría de
 * sumar en cualquier desglose. Por eso aquí sólo se ARCHIVA, y antes de
 * hacerlo se pregunta a dónde van sus movimientos. Ninguno se pierde.
 */
export default function CategoriesScreen() {
  const { categories, subcategories, categoryById } = useCategories();
  const transactions = useAppStore((state) => state.transactions);

  const addCategory = useAppStore((state) => state.addCategory);
  const updateCategory = useAppStore((state) => state.updateCategory);
  const archiveCategory = useAppStore((state) => state.archiveCategory);
  const addSubcategory = useAppStore((state) => state.addSubcategory);
  const updateSubcategory = useAppStore((state) => state.updateSubcategory);
  const archiveSubcategory = useAppStore((state) => state.archiveSubcategory);
  const showToast = useAppStore((state) => state.showToast);

  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });
  const [subName, setSubName] = useState('');
  const [reassignTo, setReassignTo] = useState('');

  /** Cuántos movimientos usa cada categoría. Una pasada, no una por fila. */
  const usageByCategory = useMemo(() => {
    const counts = new Map<ID, number>();
    for (const tx of transactions) {
      counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [transactions]);

  const subsByCategory = useMemo(() => {
    const map = new Map<ID, Subcategory[]>();
    for (const sub of subcategories) {
      const list = map.get(sub.categoryId);
      if (list) list.push(sub);
      else map.set(sub.categoryId, [sub]);
    }
    return map;
  }, [subcategories]);

  const selected =
    sheet.kind === 'detail' ||
    sheet.kind === 'addSub' ||
    sheet.kind === 'editSub' ||
    sheet.kind === 'confirmArchive'
      ? sheet.category
      : null;

  // Se relee del store en vez de usar la copia de `sheet`: tras editar una
  // categoría, la del estado de la hoja sería la versión anterior.
  const live = selected ? (categoryById.get(selected.id) ?? selected) : null;
  const liveSubs = live ? (subsByCategory.get(live.id) ?? []) : [];

  /** Destinos posibles al archivar: cualquier otra activa del mismo tipo. */
  const reassignOptions = useMemo(() => {
    if (!live) return [];
    return categories
      .filter((c) => c.id !== live.id && !c.isSystem && (c.kind === live.kind || c.kind === 'both'))
      .map((c) => ({ value: c.id, label: c.name }));
  }, [categories, live]);

  function handleSubmit(draft: Parameters<typeof addCategory>[0]): void {
    if (sheet.kind === 'edit') {
      updateCategory(sheet.category.id, draft);
      showToast('Categoría actualizada', 'success');
    } else {
      addCategory(draft);
      showToast('Categoría creada', 'success');
    }
    setSheet({ kind: 'closed' });
  }

  function handleSubSubmit(event: React.FormEvent): void {
    event.preventDefault();
    const name = subName.trim();
    if (!name || !live) return;

    if (sheet.kind === 'editSub') {
      updateSubcategory(sheet.subcategory.id, { name });
      showToast('Subcategoría actualizada', 'success');
    } else {
      addSubcategory({ categoryId: live.id, name });
      showToast('Subcategoría creada', 'success');
    }
    setSubName('');
    setSheet({ kind: 'detail', category: live });
  }

  function handleArchive(): void {
    if (sheet.kind !== 'confirmArchive') return;
    const category = sheet.category;
    const count = usageByCategory.get(category.id) ?? 0;

    archiveCategory(category.id, reassignTo || undefined);
    setSheet({ kind: 'closed' });
    setReassignTo('');

    const destination = reassignTo
      ? (categoryById.get(reassignTo)?.name ?? 'otra categoría')
      : 'Sin categoría';
    showToast(
      count > 0
        ? `Categoría archivada. ${count} ${count === 1 ? 'movimiento pasó' : 'movimientos pasaron'} a "${destination}".`
        : 'Categoría archivada.',
      'success',
    );
  }

  const usageOfSelected = live ? (usageByCategory.get(live.id) ?? 0) : 0;

  return (
    <>
      <TopBar title="Categorías" icon="nav-categories" />

      <ScreenContainer>
        {categories.length === 0 ? (
          <Card padding="none">
            <EmptyState
              illustration="movements"
              title="No hay categorías"
              description="Crea la primera para empezar a clasificar tus movimientos."
              action={
                <Button variant="tonal" onClick={() => setSheet({ kind: 'create' })}>
                  Crear categoría
                </Button>
              }
            />
          </Card>
        ) : (
          <div className={styles.list}>
            {categories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                usageCount={usageByCategory.get(category.id) ?? 0}
                subcategoryCount={(subsByCategory.get(category.id) ?? []).length}
                onPress={(c) => setSheet({ kind: 'detail', category: c })}
              />
            ))}
          </div>
        )}
      </ScreenContainer>

      <Fab label="Nueva categoría" onClick={() => setSheet({ kind: 'create' })} />

      {/* ── HOJA 1: formulario ─────────────────────────────────────────── */}
      <Sheet
        open={sheet.kind === 'create' || sheet.kind === 'edit'}
        onClose={() => setSheet({ kind: 'closed' })}
        title={sheet.kind === 'edit' ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <Button variant="tonal" onClick={() => setSheet({ kind: 'closed' })}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID}>
              Guardar
            </Button>
          </>
        }
      >
        <CategoryForm
          key={sheet.kind === 'edit' ? sheet.category.id : 'new'}
          formId={FORM_ID}
          {...(sheet.kind === 'edit' ? { category: sheet.category } : {})}
          onSubmit={handleSubmit}
        />
      </Sheet>

      {/* ── HOJA 2: detalle, subcategorías y archivado ──────────────────── */}
      <Sheet
        open={selected !== null}
        onClose={() => setSheet({ kind: 'closed' })}
        title={
          sheet.kind === 'confirmArchive'
            ? '¿Archivar la categoría?'
            : sheet.kind === 'addSub'
              ? 'Nueva subcategoría'
              : sheet.kind === 'editSub'
                ? 'Editar subcategoría'
                : (live?.name ?? '')
        }
        footer={
          live && sheet.kind !== 'detail' ? (
            <>
              <Button variant="tonal" onClick={() => setSheet({ kind: 'detail', category: live })}>
                Cancelar
              </Button>
              {sheet.kind === 'confirmArchive' ? (
                <Button variant="danger" onClick={handleArchive}>
                  Archivar
                </Button>
              ) : (
                <Button type="submit" form="subcategory-form">
                  Guardar
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {live && sheet.kind === 'detail' && (
          <>
            <p className={styles.detailMeta}>
              {usageOfSelected === 0
                ? 'Ningún movimiento la usa todavía.'
                : `La usan ${usageOfSelected} ${usageOfSelected === 1 ? 'movimiento' : 'movimientos'}.`}
            </p>

            <div className={styles.subsHeader}>
              <h2 className={styles.subsTitle}>Subcategorías</h2>
              {!live.isSystem && (
                <button
                  type="button"
                  className={styles.addSub}
                  onClick={() => {
                    setSubName('');
                    setSheet({ kind: 'addSub', category: live });
                  }}
                >
                  <Icon name="add" size="sm" />
                  Añadir
                </button>
              )}
            </div>

            {liveSubs.length === 0 ? (
              <p className={styles.subsEmpty}>
                Sin subcategorías. Sirven para afinar: dentro de «Comida» podrías tener «Mercado»
                y «Restaurantes».
              </p>
            ) : (
              <div className={styles.subs}>
                {liveSubs.map((sub) => (
                  <div key={sub.id} className={styles.sub}>
                    <span className={styles.subName}>{sub.name}</span>
                    <button
                      type="button"
                      className={styles.subAction}
                      aria-label={`Editar ${sub.name}`}
                      onClick={() => {
                        setSubName(sub.name);
                        setSheet({ kind: 'editSub', category: live, subcategory: sub });
                      }}
                    >
                      <Icon name="edit" size="sm" />
                    </button>
                    <button
                      type="button"
                      className={cn(styles.subAction, styles.subDanger)}
                      aria-label={`Eliminar ${sub.name}`}
                      onClick={() => {
                        archiveSubcategory(sub.id);
                        showToast('Subcategoría eliminada. Sus movimientos se conservan.', 'success');
                      }}
                    >
                      <Icon name="delete" size="sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {live.isSystem ? (
              <p className={styles.systemNote}>
                Es una categoría del sistema: la app la necesita para clasificar los ajustes de
                saldo y los movimientos sin clasificar. No se puede editar ni archivar.
              </p>
            ) : (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionRow}
                  onClick={() => setSheet({ kind: 'edit', category: live })}
                >
                  <Icon name="edit" size="md" />
                  Editar categoría
                </button>
                <button
                  type="button"
                  className={cn(styles.actionRow, styles.actionDanger)}
                  onClick={() => {
                    setReassignTo('');
                    setSheet({ kind: 'confirmArchive', category: live });
                  }}
                >
                  <Icon name="delete" size="md" />
                  Archivar categoría
                </button>
              </div>
            )}
          </>
        )}

        {live && (sheet.kind === 'addSub' || sheet.kind === 'editSub') && (
          <form id="subcategory-form" className={styles.subForm} onSubmit={handleSubSubmit} noValidate>
            <TextField
              label="Nombre"
              value={subName}
              onChange={setSubName}
              placeholder="p. ej. Mercado"
              maxLength={40}
              required
              autoFocus
            />
            <p className={styles.subFormHint}>
              Hereda el color y el icono de <strong>{live.name}</strong>.
            </p>
          </form>
        )}

        {live && sheet.kind === 'confirmArchive' && (
          <>
            <p className={styles.confirmText}>
              <strong>{live.name}</strong> dejará de ofrecerse al anotar movimientos.{' '}
              {usageOfSelected > 0 ? (
                <>
                  Los <strong>{usageOfSelected}</strong>{' '}
                  {usageOfSelected === 1 ? 'movimiento que la usa' : 'movimientos que la usan'} no
                  se borran: pasan a la categoría que elijas.
                </>
              ) : (
                'No la usa ningún movimiento, así que no se reclasifica nada.'
              )}
            </p>

            {usageOfSelected > 0 && (
              <Select
                label="Mover esos movimientos a"
                value={reassignTo}
                onChange={setReassignTo}
                options={reassignOptions}
                placeholder="Sin categoría"
                help="Si no eliges ninguna, quedarán en «Sin categoría» y podrás reclasificarlos después filtrando por ella."
              />
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
