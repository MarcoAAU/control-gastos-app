import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants';
import { ScreenContainer, TopBar } from '@/components/layout';
import { Button, Card, Icon, Sheet } from '@/components/ui';
import {
  backupFileName,
  buildBackup,
  parseBackup,
} from '@/services/backup/exportAppData';
import { createDemoData } from '@/services/demo/createDemoData';
import { useAppStore } from '@/store';
import { selectPersisted } from '@/store/types';
import { formatDateShort } from '@/utils/date';
import styles from './SettingsScreen.module.css';

const APP_VERSION = '2.0.0';

type SheetState =
  | { kind: 'closed' }
  | { kind: 'confirmImport'; fileName: string; raw: string }
  | { kind: 'confirmDemo' }
  | { kind: 'confirmClear' };

/**
 * Ajustes: respaldo de los datos, información de la app y los avisos de la
 * migración. Porta la vista de ajustes de v1.
 *
 * ── EXPORTAR / IMPORTAR ES LA ÚNICA FUNCIÓN NUEVA DE LA ETAPA DE PARIDAD ──
 * Y está justificada: la Fase 10 despliega la migración v1 → v2 sobre datos
 * reales y regenera el APK, que toca el almacenamiento del WebView. El usuario
 * tiene que poder sacar sus datos ANTES de eso. Un respaldo que sólo vive
 * dentro de la app no sirve para el escenario del que hay que protegerse.
 */
export default function SettingsScreen() {
  const migrationWarnings = useAppStore((state) => state.meta.migrationWarnings);
  const migratedFrom = useAppStore((state) => state.meta.migratedFrom);
  const lastExportedAt = useAppStore((state) => state.settings.backup.lastExportedAt);
  const accountCount = useAppStore((state) => state.accounts.length);
  const transactionCount = useAppStore((state) => state.transactions.length);

  const markExported = useAppStore((state) => state.markExported);
  const replaceAllData = useAppStore((state) => state.replaceAllData);
  const clearAllData = useAppStore((state) => state.clearAllData);
  const dismissMigrationWarnings = useAppStore((state) => state.dismissMigrationWarnings);
  const showToast = useAppStore((state) => state.showToast);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' });

  const hasData = accountCount > 0 || transactionCount > 0;

  function handleExport(): void {
    // Se lee el estado con `getState()` en vez de suscribirse: esto ocurre una
    // vez al pulsar, y suscribirse a todo el documento repintaría la pantalla
    // con cada cambio.
    const data = selectPersisted(useAppStore.getState());
    const backup = buildBackup(data, APP_VERSION);

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName();
    link.click();
    // Sin esto el blob se queda en memoria hasta recargar la página.
    URL.revokeObjectURL(url);

    markExported();
    showToast('Respaldo descargado. Guárdalo fuera del teléfono.', 'success');
  }

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    // Se limpia el input SIEMPRE: si no, elegir el mismo archivo dos veces
    // seguidas no dispara `change` y parece que la app se ha colgado.
    event.target.value = '';
    if (!file) return;

    const raw = await file.text();
    const result = parseBackup(raw);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    // Se confirma ANTES de tocar nada: importar reemplaza todo lo que hay.
    setSheet({ kind: 'confirmImport', fileName: file.name, raw });
  }

  function confirmImport(): void {
    if (sheet.kind !== 'confirmImport') return;
    const result = parseBackup(sheet.raw);
    if (!result.ok) {
      showToast(result.error, 'error');
      setSheet({ kind: 'closed' });
      return;
    }

    replaceAllData(result.data);
    setSheet({ kind: 'closed' });
    showToast(
      result.warnings.length > 0
        ? `Respaldo restaurado con avisos: ${result.warnings[0]}`
        : 'Respaldo restaurado.',
      result.warnings.length > 0 ? 'info' : 'success',
    );
  }

  function confirmDemo(): void {
    replaceAllData(createDemoData());
    setSheet({ kind: 'closed' });
    showToast('Datos de ejemplo cargados. Son ficticios: no son tu dinero.', 'info');
  }

  function confirmClear(): void {
    clearAllData();
    setSheet({ kind: 'closed' });
    showToast('Todos tus datos han sido borrados.', 'success');
  }

  return (
    <>
      <TopBar title="Ajustes" icon="nav-settings" />

      <ScreenContainer>
        {migrationWarnings.length > 0 && (
          <Card className={styles.warningCard}>
            <h2 className={styles.sectionTitle}>
              <Icon name="warning" size="md" />
              Avisos de la migración
            </h2>
            <ul className={styles.warningList}>
              {migrationWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <Button variant="tonal" onClick={dismissMigrationWarnings}>
              Entendido
            </Button>
          </Card>
        )}

        {/* ── Copia de seguridad ─────────────────────────────────────────── */}
        <Card className={styles.card}>
          <h2 className={styles.sectionTitle}>Copia de seguridad</h2>
          <p className={styles.sectionText}>
            Tus datos viven sólo en este dispositivo. Nadie más los ve, y tampoco hay una copia en
            ningún servidor: si borras la app o cambias de teléfono, se van con ella. Descarga un
            respaldo de vez en cuando.
          </p>

          <div className={styles.stats}>
            <span>{accountCount} cuentas</span>
            <span>·</span>
            <span>{transactionCount} movimientos</span>
          </div>

          {lastExportedAt && (
            <p className={styles.meta}>
              Último respaldo: {formatDateShort(lastExportedAt.slice(0, 10))}
            </p>
          )}

          <div className={styles.actions}>
            <Button onClick={handleExport}>
              <Icon name="export" size="sm" />
              Descargar respaldo
            </Button>
            <Button variant="tonal" onClick={() => fileInputRef.current?.click()}>
              <Icon name="import" size="sm" />
              Restaurar respaldo
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.hiddenInput}
            onChange={handleFileChosen}
          />
        </Card>

        {/* ── Categorías ─────────────────────────────────────────────────── */}
        <Link to={ROUTES.categories} className={styles.navRow}>
          <Icon name="nav-categories" size="md" />
          <span className={styles.navText}>
            <span className={styles.navTitle}>Categorías</span>
            <span className={styles.navHint}>Crear, editar y organizar tus categorías</span>
          </span>
          <Icon name="chevron-right" size="sm" />
        </Link>

        {/* ── Aviso de conexión bancaria ─────────────────────────────────── */}
        <Card className={styles.card}>
          <h2 className={styles.sectionTitle}>
            <Icon name="info" size="md" />
            Sobre la conexión con bancos
          </h2>
          <p className={styles.sectionText}>
            <strong>La conexión bancaria es simulada.</strong> Esta app no se conecta con ningún
            banco, no importa movimientos automáticamente y{' '}
            <strong>nunca te pedirá las claves de tu banco</strong>. Los nombres de bancos son
            sólo etiquetas para organizar las cuentas que llevas a mano. Si alguna vez una
            aplicación parecida te pide tus credenciales bancarias, desconfía.
          </p>
        </Card>

        {/* ── Datos de ejemplo ───────────────────────────────────────────── */}
        <Card className={styles.card}>
          <h2 className={styles.sectionTitle}>Datos de ejemplo</h2>
          <p className={styles.sectionText}>
            Llena la app con una cuenta y unos movimientos ficticios para ver cómo se comporta.
            {hasData
              ? ' Reemplazará lo que tengas ahora, así que descarga antes un respaldo.'
              : ' Podrás borrarlos después desde aquí mismo.'}
          </p>
          <Button variant="tonal" onClick={() => setSheet({ kind: 'confirmDemo' })}>
            Cargar datos de ejemplo
          </Button>
        </Card>

        {/* ── Zona peligrosa ─────────────────────────────────────────────── */}
        <Card className={styles.card}>
          <h2 className={styles.sectionTitle}>Borrar datos</h2>
          <p className={styles.sectionText}>
            Elimina cuentas, movimientos e historial de este dispositivo. No se puede deshacer:
            descarga antes un respaldo.
          </p>
          <Button variant="danger" onClick={() => setSheet({ kind: 'confirmClear' })}>
            Borrar todos los datos
          </Button>
        </Card>

        <p className={styles.version}>
          Mis Gastos {APP_VERSION}
          {migratedFrom === 'legacy' && ' · datos migrados desde la versión anterior'}
        </p>
      </ScreenContainer>

      {/* ── Confirmaciones ─────────────────────────────────────────────────
          Ambas son destructivas y ninguna usa `window.confirm()`: las PWA
          instaladas en iOS lo deshabilitan en silencio y el usuario pulsaba
          sin que pasara nada (nota 2 del checklist). */}
      <Sheet
        open={sheet.kind === 'confirmImport'}
        onClose={() => setSheet({ kind: 'closed' })}
        title="¿Restaurar este respaldo?"
        footer={
          <>
            <Button variant="tonal" onClick={() => setSheet({ kind: 'closed' })}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmImport}>
              Restaurar
            </Button>
          </>
        }
      >
        {sheet.kind === 'confirmImport' && (
          <p className={styles.confirmText}>
            Se reemplazarán <strong>todos</strong> tus datos actuales ({accountCount} cuentas,{' '}
            {transactionCount} movimientos) con el contenido de{' '}
            <strong>{sheet.fileName}</strong>. Esto no se puede deshacer.
          </p>
        )}
      </Sheet>

      <Sheet
        open={sheet.kind === 'confirmDemo'}
        onClose={() => setSheet({ kind: 'closed' })}
        title="¿Cargar datos de ejemplo?"
        footer={
          <>
            <Button variant="tonal" onClick={() => setSheet({ kind: 'closed' })}>
              Cancelar
            </Button>
            <Button variant={hasData ? 'danger' : 'filled'} onClick={confirmDemo}>
              Cargar ejemplo
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          {hasData ? (
            <>
              Se reemplazarán tus <strong>{accountCount} cuentas</strong> y tus{' '}
              <strong>{transactionCount} movimientos</strong> por datos ficticios. Esto no se
              puede deshacer: si no tienes un respaldo, cancela y descárgalo antes.
            </>
          ) : (
            <>
              Se cargarán una cuenta de banco, una de efectivo y diez movimientos de los últimos
              30 días. Son <strong>cifras inventadas</strong>, sólo para ver cómo se comporta la
              app. Puedes borrarlas cuando quieras.
            </>
          )}
        </p>
      </Sheet>

      <Sheet
        open={sheet.kind === 'confirmClear'}
        onClose={() => setSheet({ kind: 'closed' })}
        title="¿Borrar todos los datos?"
        footer={
          <>
            <Button variant="tonal" onClick={() => setSheet({ kind: 'closed' })}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmClear}>
              Borrar todo
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          Se borrarán tus <strong>{accountCount} cuentas</strong>, tus{' '}
          <strong>{transactionCount} movimientos</strong> y todo el historial guardado. Esta
          acción no se puede deshacer.
        </p>
      </Sheet>
    </>
  );
}
