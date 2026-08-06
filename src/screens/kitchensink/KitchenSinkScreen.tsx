import { useState } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconButton,
  Modal,
  Sheet,
  Skeleton,
} from '@/components/ui';
import { ICON_REGISTRY } from '@/constants/icons';
import { useAppStore } from '@/store';
import styles from './KitchenSinkScreen.module.css';

/**
 * Catálogo visual de los primitivos. SÓLO EXISTE EN DESARROLLO — se excluye
 * del bundle de producción desde App.tsx.
 *
 * Su función no es decorativa: es el banco de pruebas donde se comprueba de un
 * vistazo que ningún componente tiene colores incrustados. El botón de arriba
 * a la derecha alterna `data-theme`; si algo no cambia con el tema, está mal
 * escrito y se ve al instante.
 */

const SURFACE_TOKENS = [
  'surface',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'primary',
  'primary-container',
  'success',
  'success-container',
  'error',
  'error-container',
  'warning',
  'outline',
];

const TYPE_SCALE = [
  ['display', '32'],
  ['headline', '24'],
  ['title-lg', '18'],
  ['title', '16'],
  ['body', '14'],
  ['label', '12'],
] as const;

export default function KitchenSinkScreen() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const showToast = useAppStore((state) => state.showToast);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }

  function simulateLoading() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1500);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Kitchen sink</div>
          <div className={styles.headerHint}>Primitivos y tokens · sólo desarrollo</div>
        </div>
        <Button variant="tonal" size="sm" onClick={toggleTheme} iconStart="refresh">
          {theme === 'dark' ? 'Claro' : 'Oscuro'}
        </Button>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Roles de color</h2>
        <div className={styles.swatches}>
          {SURFACE_TOKENS.map((token) => (
            <div
              key={token}
              className={styles.swatch}
              style={{ background: `var(--color-${token})` }}
            >
              <span className={styles.swatchLabel}>{token}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Escala tipográfica</h2>
        <div className={styles.stack}>
          {TYPE_SCALE.map(([name, px]) => (
            <div key={name} className={styles.typeSample}>
              <span style={{ fontSize: `var(--font-size-${name})`, fontWeight: 700 }}>
                $1.250.000
              </span>
              <small>
                {name} · {px}px
              </small>
            </div>
          ))}
          <div className={styles.typeSample}>
            <span className={`${styles.money} ${styles.income} tabular`}>+$980.000</span>
            <span className={`${styles.money} ${styles.expense} tabular`}>-$114.900</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Button — variantes</h2>
        <div className={styles.row}>
          <Button variant="filled">Guardar</Button>
          <Button variant="tonal">Cancelar</Button>
          <Button variant="outlined">Filtrar</Button>
          <Button variant="text">Ver todo</Button>
          <Button variant="danger" iconStart="delete">
            Eliminar
          </Button>
          <Button variant="dangerText">Quitar</Button>
        </div>
        <div className={styles.row}>
          <Button size="sm">Pequeño</Button>
          <Button size="md">Mediano</Button>
          <Button size="lg">Grande</Button>
        </div>
        <div className={styles.row}>
          <Button disabled>Deshabilitado</Button>
          <Button loading={loading} onClick={simulateLoading}>
            Probar carga
          </Button>
          <Button iconStart="add" iconEnd="chevron-right">
            Con iconos
          </Button>
        </div>
        <Button fullWidth size="lg" iconStart="add">
          Agregar movimiento
        </Button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>IconButton</h2>
        <div className={styles.row}>
          <IconButton icon="refresh" label="Refrescar" variant="standard" />
          <IconButton icon="nav-settings" label="Ajustes" variant="tonal" />
          <IconButton icon="add" label="Agregar" variant="filled" />
          <IconButton icon="delete" label="Eliminar" variant="danger" />
          <IconButton icon="search" label="Buscar" size="sm" />
          <IconButton icon="search" label="Buscar" size="lg" />
          <IconButton icon="close" label="Cerrar" disabled />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Card</h2>
        <Card variant="elevated">
          <div className={styles.headerHint}>Saldo total</div>
          <div className={`${styles.money} tabular`}>$4.317.500</div>
        </Card>
        <Card variant="filled">Tarjeta rellena — el contenedor por defecto.</Card>
        <Card variant="outlined">Tarjeta con contorno — agrupa sin peso visual.</Card>
        <Card onClick={() => undefined} aria-label="Tarjeta pulsable de ejemplo">
          Tarjeta pulsable — es un &lt;button&gt; real (probar con Tab).
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Skeleton</h2>
        <Card padding="sm">
          <div className={styles.row}>
            <Skeleton variant="circle" width={38} height={38} />
            <div style={{ flex: 1 }}>
              <Skeleton variant="text" count={2} />
            </div>
          </div>
        </Card>
        <Skeleton variant="rect" height={120} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>EmptyState</h2>
        <Card padding="none">
          <EmptyState
            icon="nav-transactions"
            title="Sin movimientos todavía"
            description="Registra tu primer ingreso o gasto para empezar a ver tus resúmenes."
            action={<Button iconStart="add">Agregar movimiento</Button>}
          />
        </Card>
        <Card padding="none">
          <EmptyState compact icon="search" title="Ningún resultado para tu búsqueda" />
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Overlays y avisos</h2>
        <div className={styles.row}>
          <Button variant="tonal" onClick={() => setSheetOpen(true)}>
            Abrir hoja
          </Button>
          <Button variant="tonal" onClick={() => setModalOpen(true)}>
            Abrir diálogo
          </Button>
          <Button variant="dangerText" onClick={() => setConfirmOpen(true)}>
            Confirmar borrado
          </Button>
        </div>
        <div className={styles.row}>
          <Button variant="outlined" size="sm" onClick={() => showToast('Movimiento guardado', 'success')}>
            Toast éxito
          </Button>
          <Button variant="outlined" size="sm" onClick={() => showToast('Revisa este dato')}>
            Toast info
          </Button>
          <Button variant="outlined" size="sm" onClick={() => showToast('No se pudo guardar', 'error')}>
            Toast error
          </Button>
        </div>
        <p className={styles.headerHint}>
          Con la hoja abierta: Escape la cierra, Tab no se escapa detrás y el botón Atrás del
          navegador la cierra en vez de salir de la app.
        </p>

        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Hoja inferior"
          footer={
            <>
              <Button variant="tonal" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setSheetOpen(false)}>Guardar</Button>
            </>
          }
        >
          <p className={styles.headerHint}>
            Arrastra desde el asa superior hacia abajo para cerrarla.
          </p>
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} style={{ padding: 'var(--space-2) 0' }}>
              Línea {i + 1} — el contenido se desplaza dentro de la hoja, sin mover el fondo.
            </p>
          ))}
        </Sheet>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Diálogo centrado"
          footer={<Button onClick={() => setModalOpen(false)}>Entendido</Button>}
        >
          <p className={styles.headerHint}>
            Para decisiones cortas. Si hay que rellenar algo, va en una hoja.
          </p>
        </Modal>

        <ConfirmDialog
          open={confirmOpen}
          title="¿Eliminar la cuenta?"
          message="Se eliminará la cuenta y sus movimientos dejarán de contar en el saldo total. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          destructive
          onConfirm={() => {
            setConfirmOpen(false);
            showToast('Cuenta eliminada', 'success');
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Iconos ({Object.keys(ICON_REGISTRY).length}) + fallback a emoji
        </h2>
        <div className={styles.iconGrid}>
          {Object.keys(ICON_REGISTRY).map((key) => (
            <div key={key} className={styles.iconCell}>
              <Icon name={key} size="lg" />
              {key}
            </div>
          ))}
          {['🍔', '🏦', '💜', '🛍️'].map((emoji) => (
            <div key={emoji} className={styles.iconCell}>
              <Icon name={emoji} size="lg" />
              legado
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
