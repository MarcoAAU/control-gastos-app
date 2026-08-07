# Decisiones técnicas — Mis Gastos v2

Registro vivo de las decisiones de arquitectura de la reescritura v2, con su justificación y las alternativas descartadas. Se actualiza al cerrar cada fase.

- **v1** = la app en JavaScript vanilla (tag `v1-vanilla`, commit `5dc7494`). Su auditoría completa está en [`../ANALISIS_COMPLETO_DEL_PROYECTO.md`](../ANALISIS_COMPLETO_DEL_PROYECTO.md).
- **v2** = esta reescritura (rama `feat/v2-react`).

---

## ADR-001 — Reescribir en React + Vite + TypeScript en vez de modularizar el vanilla

**Contexto.** v1 son 939 líneas en un solo `app.js` con estado global mutable, render por `innerHTML`, y cero separación de capas (auditoría: arquitectura 3/10, escalabilidad 3/10). El plan de producto pide multiplicar la funcionalidad (dashboard con 5 gráficos, reportes, filtros combinables, subcategorías, seguimiento con comparativas).

**Decisión.** Reescribir sobre React 19 + Vite + TypeScript en modo `strict`.

**Por qué.** El volumen de funcionalidad nueva exige componentización y tipado reales. Modularizar el vanilla habría resuelto la organización de archivos pero no la reactividad manual (cada mutación obliga a recordar qué `render*()` llamar — la fuente de la mayoría de bugs de v1) ni la seguridad de tipos entre 6 modelos de datos relacionados.

**Consecuencia positiva no obvia:** React escapa todo el texto interpolado por defecto, así que el hallazgo de self-XSS de la auditoría (§16 — `acc.nickname` sin escapar en 2 de 3 puntos de render) **desaparece por construcción**, sin necesitar una fase dedicada a ello.

**Alternativa descartada:** Capacitor para el APK. Requiere instalar Android Studio + JDK + Gradle (varios GB); esta máquina tiene Node 24 y npm 11 pero **no** tiene `java`. Se mantiene PWABuilder, que ya funciona y no necesita toolchain nativo.

---

## ADR-002 — Zustand para el estado, no Context ni Redux

**Decisión.** Zustand 5, con slices por dominio y selectores puros en `services/`.

**Por qué.** El requisito del usuario es explícito: *"todo cambio de información debe pasar por una única capa de gestión del estado"*. Zustand lo cumple con ~1.2 kB, sin Provider, y con suscripción **por selector** (un componente solo se re-renderiza si cambió su porción concreta).

**Alternativas descartadas.**
- *Context + useReducer:* cualquier cambio re-renderiza todos los consumidores. Con 5+ gráficos derivados del mismo array de transacciones, obliga a `React.memo` defensivo por todas partes o a partir el contexto en múltiples providers. Además el reducer central acabaría siendo el nuevo `app.js` de 900 líneas — justo lo que estamos huyendo.
- *Redux Toolkit:* ~13 kB + boilerplate de slices/thunks para una app sin servidor, sin async real y sin caché de red. Su valor principal (RTK Query, devtools de time-travel) no aplica aquí.

**Sub-decisión: sin el middleware `persist` de Zustand.** El middleware es dueño del formato serializado y de su propio `version`/`migrate`, lo que compite con el `AppData.schemaVersion` que necesitamos controlar nosotros, y hace incómodo migrar desde una **clave ajena** (`gastos_app_data_v1`, escrita por v1). Se persiste con un `store.subscribe()` explícito y con debounce — más simple de razonar y trivialmente testeable.

---

## ADR-003 — El saldo de una cuenta es derivado, no almacenado

**Contexto — y por qué esta es la decisión más delicada del proyecto.** En v1 el usuario reportó que *"los gastos se restan automáticamente de los ingresos"*. La causa raíz real (verificada leyendo `app.js:221`) **no** era que los gastos tocaran el saldo: era que la tarjeta rotulada **"Ingresos"** en el Inicio calculaba en realidad `state.accounts.reduce((s,a)=>s+a.balance,0)` — el **saldo total de las cuentas**, mal rotulado. Como los gastos reducían ese saldo, "Ingresos" bajaba con cada gasto.

La corrección aplicada entonces (commit `ad2c501`: `balanceDelta()` devuelve 0 para gastos) trató el síntoma: **rompió el libro contable para arreglar una etiqueta**. Desde ese commit, los gastos dejaron de afectar el saldo de las cuentas, que es contablemente incorrecto.

**Decisión.** `Account` **no** almacena `balance`. Almacena `initialBalance` + `initialBalanceDate`, y el saldo actual es una función pura:

```
computeAccountBalance(cuenta, transacciones) = initialBalance + Σingresos − Σgastos
```

Y se separan explícitamente los dos conceptos que v1 confundía:

| Métrica | Naturaleza | Fuente |
|---|---|---|
| **Saldo total** | *stock* (foto puntual) | Σ de saldos derivados de las cuentas |
| **Ingresos del periodo** | *flujo* | Σ transacciones `type='income'` y `isAdjustment=false` |
| **Gastos del periodo** | *flujo* | Σ transacciones `type='expense'` y `isAdjustment=false` |

**Por qué es seguro volver al modelo derivado ahora**, si la sesión anterior "lo arregló" quitándolo: porque el nuevo spec del usuario ya pide *"Saldo total"* **y** *"Ingresos del día"* como métricas **distintas**. La confusión de v1 era de etiquetado, no de modelo. Con las dos cifras separadas y bien nombradas, un gasto puede reducir el saldo (correcto contablemente) sin tocar la cifra de ingresos (que era la queja real).

**Salvaguardas contra la regresión:**
1. Regla de ESLint (`no-restricted-imports`): `services/metrics/**` no puede importar de `services/balance/**`. La única excepción autorizada es la sección `FinancialSummary` del dashboard, que es la que muestra "Saldo total".
2. Tests de invariante escritos **en la Fase 8**, no al final: *"agregar un gasto no cambia el total de ingresos del periodo"* y *"una transacción de ajuste no aparece en ingresos ni en gastos"*.

---

## ADR-004 — "Ajustar saldo" crea una transacción de ajuste, no muta un campo

**Decisión.** Cuando el usuario escribe su saldo real, el sistema calcula `delta = objetivo − saldoDerivado` y crea **una transacción** marcada con `isAdjustment: true`, categoría de sistema `sys_ajuste`, fechada hoy.

**Por qué no reescribir `initialBalance`.** Reescribir el saldo inicial **reescribe el pasado**: todos los reportes históricos y la gráfica de evolución del saldo cambiarían retroactivamente, y el usuario perdería la respuesta a "¿por qué cambió mi saldo?". Con el ajuste como transacción fechada: el pasado queda intacto, hay rastro de auditoría, y **es reversible** (borrar el ajuste deshace el cambio).

**La salvaguarda clave.** `isAdjustment: true` excluye esa transacción de *todos* los totales de ingresos/gastos, de las gráficas por categoría y del gasto promedio diario. Solo afecta al saldo. Sin esta exclusión, ajustar el saldo inflaría artificialmente los "ingresos del mes" — que es exactamente la clase de confusión que originó la queja de v1.

**Dónde se ve el ajuste (precisado en la Fase 8).** Los ajustes se **ocultan** de la lista de Movimientos por defecto: son contabilidad interna y mezclarlos con los gastos reales del usuario es justo lo que se quiere evitar. Pero ocultarlos siempre los volvería **irreversibles en la práctica** — no se puede borrar lo que no se puede ver, y la reversibilidad es la mitad del valor de esta decisión. Solución: filtrar por la categoría «Ajuste de saldo» los revela (`includeAdjustments`), y aun así el resumen de la pantalla los sigue contando como $0 de ingreso y $0 de gasto. El texto de confirmación del ajuste le dice al usuario exactamente dónde encontrarlo.

**Una sola aritmética.** El importe que la pantalla **anuncia** antes de confirmar y el que el store **registra** salen ambos de `services/balance/solveAdjustment.ts`. El store no recalcula el delta por su cuenta: en una app de dinero, anunciar $250.000 y guardar otra cosa es de los errores que destruyen la confianza. Un test compara ambas salidas (`store.test.ts`).

**Nota de UI (Fase 12):** "Ajustar saldo actual" (registra un ajuste hoy) y "Cambiar saldo inicial" (sí reescribe el pasado, con confirmación explícita) son dos acciones distintas y deben distinguirse claramente en la interfaz.

---

## ADR-005 — Recharts (SVG) en vez de Canvas a mano

**Decisión.** Recharts 3, cargado con `React.lazy()` en las pantallas de Dashboard y Reportes.

**Por qué.** v1 perdió tiempo real en dos bugs de Canvas 2D documentados en su propio código: el crecimiento exponencial del alto por `devicePixelRatio` (`app.js:342-363`) y un workaround para el `resize` que dispara la barra de direcciones móvil al scrollear (`app.js:928-936`). Con SVG esa clase entera de bug desaparece, y los colores pueden ligarse a variables CSS (`var(--color-*)`), lo que hace que el tema claro/oscuro salga gratis. Además hacen falta 5 gráficos en el Dashboard y más en Reportes: tooltips, leyendas y ejes a mano son semanas de trabajo.

**Coste y mitigación.** ~95 kB gz (arrastra módulos de d3). Es **obligatorio** que viaje en un chunk lazy: la carga inicial no debe pagarlo. Presupuesto: primera carga ≤ 100 kB gz.

---

## ADR-006 — Fechas como hora de pared local, nunca como instante UTC

**Decisión.** Las transacciones guardan `date: 'YYYY-MM-DD'` y `time: 'HH:mm'` como **hora local de pared**, sin zona horaria. El orden se calcula con la clave lexicográfica `` `${date}T${time}` ``.

**Por qué.** Colombia es UTC-5. Si se guardara `new Date().toISOString()`, un gasto registrado a las 20:00 del día 5 se almacenaría como `2026-08-06T01:00:00Z` y aparecería en el **día siguiente** en cualquier agrupación por fecha. v1 ya tiene esa trampa latente en `todayISO()`; no se replica.

Para el resto de operaciones de calendario (semanas ISO, meses, comparativas) se usa **date-fns 4** con `weekStartsOn: 1` y locale `es`, en vez de reimplementar a mano como hacía v1 (`app.js:175-186`) — escalar eso a comparativas anuales es una fábrica de bugs de borde.

---

## ADR-007 — HashRouter, y por qué ahora sí hace falta un router

**Decisión.** `react-router-dom` 7 en modo `HashRouter`.

**Por qué router, si v1 no tenía.** En el APK (TWA), el botón Atrás de Android hoy **cierra la app** en vez de volver a la pantalla anterior — la auditoría lo lista como problema Medio #7. Con historial real, Atrás navega entre pantallas y cierra las hojas abiertas. Es la mejora de UX de mayor impacto por línea de código en el APK.

**Por qué Hash y no Browser.** GitHub Pages sirve el proyecto en un subpath y no tiene fallback de SPA; `BrowserRouter` exigiría el truco del `404.html`, que interactúa mal con el Service Worker precacheado y con el `start_url` del TWA. `HashRouter` es a prueba de balas en hosting estático y offline. El coste (URLs con `#/`) es irrelevante en una app instalada.

**Los modales y hojas NO son rutas** — son estado de `uiSlice`. Simplicidad sobre pureza.

---

## ADR-008 — Capa de almacenamiento con interfaz asíncrona desde el día uno

**Decisión.** `StorageAdapter` con métodos `async`, aunque `localStorage` sea síncrono. `AppDataRepository` es la **única puerta** a los datos.

**Por qué async si hoy no hace falta.** Porque migrar mañana a IndexedDB (mayor capacidad, mejores consultas) o añadir sincronización en la nube pasa a ser un cambio de una línea en el repositorio, en vez de propagar `await` por 40 archivos de pantallas.

**Reglas de aislamiento, verificables mecánicamente:**
1. La palabra `localStorage` aparece **exactamente una vez** en todo `src/`: en `storage/adapters/localStorageAdapter.ts`.
2. Solo `store/bootstrap.ts` y `store/persistence.ts` importan `AppDataRepository`.
3. `screens/**` y `components/**` no importan nada de `storage/**`.

Se enforcean con ESLint (`no-restricted-imports`) y se verifican con `grep -rn "localStorage" src/`, que debe devolver una sola línea.

**Mejora sobre v1:** hoy `saveState()` (`app.js:78-80`) falla **en silencio** si el almacenamiento está lleno. En v2 `save()` devuelve `'quota-exceeded'` y la app muestra un aviso al usuario.

---

## ADR-009 — Migración v1 → v2 defensiva, preservando el saldo visible

**Contexto.** El blob de v1 (`gastos_app_data_v1`) no tiene campo de versión, así que la detección es por presencia de clave.

**Decisión — la fórmula que preserva el saldo.** Como el saldo en v2 es derivado, se despeja el saldo inicial hacia atrás para que el número que ve el usuario **no cambie**:

```
initialBalance = balanceViejo − Σ(ingresos de la cuenta) + Σ(gastos de la cuenta)
```

Así `computeAccountBalance()` el día 1 devuelve **exactamente** el mismo saldo que mostraba v1. La alternativa ingenua (`initialBalance = balanceViejo`) cambiaría el saldo visible de golpe, posiblemente en millones — inaceptable en una app financiera.

**Principios defensivos de la migración:**
- **Respaldar antes de tocar nada.** Copia cruda a `gastos_app_backup_<timestamp>` como primer paso. Si eso falla, se aborta.
- **El blob v1 nunca se borra.** Cuesta unos KB y es el seguro de vida.
- **Coerción por registro, no por lote.** Un movimiento con monto corrupto se descarta y se anota en `migrationWarnings`; nunca hace fallar la migración completa.
- **Nunca perder un movimiento del usuario.** Si su cuenta ya no existe, se reasigna a una cuenta "Sin asignar" creada al vuelo en vez de descartarlo.
- **Verificación de integridad antes de escribir:** para cada cuenta se comprueba que el saldo derivado coincide con el de v1 (±1 por redondeo).
- **Los snapshots del historial no se recalculan.** Un snapshot es una foto; se marca `origin: 'legacy'` y la UI añade una nota explicando que en esas entradas antiguas "Ingresos" correspondía al saldo total (el bug de `app.js:221`).

---

## ADR-010 — Testing quirúrgico con Vitest, no cobertura amplia

**Decisión.** Vitest sobre la lógica pura únicamente: `storage/migrations/**`, `services/balance/**`, `services/periods/**`, `services/metrics/**`, `services/filters/**`, `utils/money.ts`. **Sin** tests de componentes ni E2E.

**Por qué este recorte.** El objetivo no es "cobertura", es proteger lo que puede causar daño irreversible: corromper datos financieros en la migración, o reintroducir el bug de stock-vs-flujo. Los tests de componentes y E2E (`@testing-library` + Playwright) añaden fricción notable por cada cambio de UI y, en una app de un solo usuario y un solo desarrollador, no compensan. Objetivo realista: 40–60 tests, suite completa en menos de 2 segundos.

**Compuerta de calidad al cierre de cada fase:**
```
npm run lint && npx tsc --noEmit && npm run test && npm run build && npm run preview
```
Ninguna fase se da por cerrada si esa cadena no pasa limpia.

---

## ADR-011 — CSS Modules + tokens MD3, sin framework de estilos

**Decisión.** CSS Modules (soporte nativo de Vite, cero dependencias) con un sistema de design tokens en CSS custom properties siguiendo los roles de Material Design 3.

**Por qué.** v1 ya tiene un lenguaje visual coherente basado en variables CSS (`style.css:1-14`) que conviene **evolucionar** a roles MD3, no tirar. CSS Modules da scoping por archivo sin runtime ni build extra.

**Alternativas descartadas:** Tailwind (otra toolchain + clases largas en el JSX; su ventaja de velocidad no compensa cuando ya existe un design system que portar), styled-components/emotion (coste en runtime y bundle para cero beneficio aquí), CSS global plano (colisiones de nombres a esta escala).

**Iconos:** `lucide-react` (tree-shaking real, ~0.5–1 kB por ícono). Los emojis heredados de v1 (`🏦`, `🍔`) se preservan sin migrar datos: el campo `icon` guarda una clave; si no existe en el registro, se renderiza el string tal cual.

**Animación:** CSS puro (`transform`/`opacity` + curvas MD3) más dos hooks propios pequeños (`usePresence` para desmontaje diferido, `useDragDismiss` para arrastrar hojas). Framer Motion costaría 15–34 kB gz para lo mismo. Todo respeta `prefers-reduced-motion`.

---

## ADR-012 — Texto oscuro sobre el color primario (contraste AA)

**Contexto.** v1 pintaba texto blanco sobre el acento `#6c8dff` (`.primary-btn`, `.period-tab.active`, `.type-btn.active`, `.fab`). Ese par da **3.05:1** de contraste, por debajo del mínimo WCAG AA de 4.5:1 para texto normal. Es el único incumplimiento de contraste de la paleta heredada: todos los demás pares (texto atenuado, verde de ingresos, rojo de gastos) superan 6:1.

**Decisión.** En tema oscuro, `--color-on-primary` es `#0a1338` (azul muy oscuro) en lugar de blanco → **5.92:1**. El color primario no cambia: `#6c8dff` sigue siendo el acento que el usuario reconoce.

**Por qué esto y no oscurecer el acento.** Oscurecer `#6c8dff` lo suficiente para que el blanco pasara AA lo convertiría en un azul distinto y cambiaría la identidad visual de la app. Invertir el contenido conserva el color de marca y además es lo que Material Design 3 prescribe: en un esquema oscuro el primario es un tono claro y su contenido va oscuro. En tema claro ocurre lo contrario y `--color-on-primary` sí es blanco sobre `#3a5bd9` (5.71:1).

**Consecuencia visible.** El texto de los botones principales pasa de blanco a azul muy oscuro. Es el único cambio cromático deliberado respecto a v1 y está anotado en `CHECKLIST-REGRESION.md` como reemplazo intencional, no como regresión.

**Verificación.** Auditoría automática sobre el kitchensink: 121 elementos con texto medidos contra su fondo efectivo, en ambos temas, 0 incumplimientos (peor caso normalizado 5.92 en oscuro, 5.07 en claro).

---

## ADR-013 — "Desconectar cuenta" es un borrado lógico, y los movimientos conservan su nombre

**Decisión.** Desconectar una cuenta la marca con `archivedAt` en vez de eliminarla. Deja de aparecer en la lista, sale del "Saldo total" y no se ofrece en formularios ni filtros — pero el registro sigue existiendo.

**Por qué no borrarla de verdad.** v1 la eliminaba del array (`app.js:593`) y sus movimientos quedaban apuntando a un id inexistente: la lista los mostraba con un guion, y el usuario perdía para siempre el dato de a qué cuenta pertenecía cada gasto. El borrado lógico conserva la integridad referencial sin obligar a decidir qué hacer con el historial.

**La consecuencia que hay que cablear a mano.** Con la cuenta archivada, un índice construido sólo con las cuentas activas daría el mismo guion que v1 — se habría conservado el dato y aun así no se mostraría. Por eso hay **dos accesos distintos** y usarlos al revés es un error:

| Hook | Contiene | Para qué |
|---|---|---|
| `useAccounts()` | sólo activas | **Ofrecer** opciones: formularios, filtros, lista de cuentas |
| `useAccountLookup()` | todas, archivadas incluidas | **Resolver** nombres de movimientos ya existentes |

**Verificación (Fase 8).** Se desconectó una cuenta con 2 movimientos: los movimientos siguen ahí y siguen diciendo "Tarjeta Nu"; la cuenta desaparece del selector de filtro; el saldo total se recalcula excluyéndola.

---

## Decisiones pendientes (se resolverán en su fase)

| Tema | Fase | Nota |
|---|---|---|
| Umbral de virtualización de listas largas | 14 | Se anota el umbral (~500 ítems); no se implementa hasta que haga falta |
| Formato exacto del CSV de reportes | 17 | Locale es-CO: separador `;` y coma decimal, para que Excel lo abra bien |
| PIN / biometría / cifrado en reposo | 19 | Solo se deja la costura arquitectónica (interfaz + implementación no-op). **No se implementa nada** en esta reescritura |
| Migración de `localStorage` a IndexedDB | — | Diferida. El `StorageAdapter` ya deja la puerta abierta |
