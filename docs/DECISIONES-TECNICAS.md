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

## ADR-014 — Las gráficas se cargan por detrás de las cifras, no junto a ellas

**Decisión.** Recharts vive en `screens/dashboard/sections/ChartsSection.tsx`, cargado con `lazy()`. Ninguna pantalla lo importa de forma estática.

**El problema que resolvió.** La carga diferida por pantalla (Fase 6) no bastaba: el Inicio **es** la pantalla de arranque, así que meter los gráficos en su chunk dejaba a todo el mundo esperando ~100 kB gz antes de ver su saldo. Medido: el chunk del Inicio pesaba 107 kB gz.

**Después de aislarlos:** Inicio 3,5 kB gz · ChartsSection 104 kB gz · carga inicial 93,8 kB gz. El saldo, los totales y los movimientos se pintan de inmediato; las gráficas llegan después, en un hueco ya reservado para que nada salte de sitio.

**Regla.** `ChartsSection` no contiene lógica, sólo presentación: recibe las series ya calculadas por `services/metrics`. Si calculara algo, ese cálculo quedaría atrapado detrás de la descarga del chunk.

---

## ADR-015 — Rangos de periodo civiles completos, no truncados a hoy

**Decisión.** `getPeriodRange('month')` devuelve el mes entero (1 al 31), no del 1 a hoy.

**Diferencia con v1.** v1 construía el rango como `[inicio, ahora + 1 día)` (`app.js:204`), así que un movimiento con fecha futura —un pago programado, una compra anotada por adelantado— no contaba en "Mes" hasta que llegaba el día. Sólo se nota si hay movimientos futuros; para "Hoy" no hay diferencia.

**Por qué se cambia.** Quien anota un gasto futuro a propósito espera verlo en el total del mes. Y Seguimiento (Fase 16) necesita comparar periodos completos entre sí: con rangos truncados, comparar "este mes" contra "el mes pasado" mezclaría un tramo parcial con uno completo.

**La semana empieza en lunes** (`WEEK_STARTS_ON = 1`), convenio es-CO. v1 lo tenía a mano y con domingo en algunos sitios. Fijado por tests, incluidos los bordes: semana que cruza el cambio de año, febrero bisiesto y no bisiesto.

---

## ADR-016 — El despliegue se verifica a sí mismo antes de publicar

**Decisión.** `npm run build` encadena dos scripts que pueden tumbar la compilación: `check-bundle-budget.mjs` y `verify-deploy.mjs`. El workflow de Pages no publica si alguno falla.

**Por qué un script y no una lista de comprobación.** Todo lo que verifica `verify-deploy.mjs` es un fallo **invisible en desarrollo** que rompe la app publicada o el APK ya instalado:

| Si cambia… | Lo que pasa | Por qué no se ve antes |
|---|---|---|
| `base` | Los assets dan 404 | En `vite dev` todo se sirve desde la raíz |
| el nombre `sw.js` | El Service Worker de v1 sigue sirviendo la app vieja **para siempre** | En local no hay un SW antiguo con el que competir |
| `scope` / `start_url` | El APK se abre con barra de direcciones, o en el navegador | El TWA no existe en local |
| falta `.nojekyll` | Pages descarta lo que empiece por `_` | Pages no interviene en local |

Ninguno de estos avisa: la app simplemente no arranca, o arranca la antigua. Un despliegue roto aquí no es una página fea — es una app de dinero que no abre, con la migración v1 → v2 a medio camino.

**Verificado** que el script falla de verdad: alterando `scope` y `display` en el manifest generado, sale con código 1 y nombra ambos problemas.

**El despliegue va en la Fase 10 y no al final** a propósito. Los riesgos externos —Service Worker, TWA, keystore, migración sobre datos reales— se validan más barato con una app en paridad que con ocho funcionalidades nuevas encima.

---

## ADR-017 — El keystore del APK no vive en el repositorio, y el repositorio lo impide

**Contexto.** El keystore original **existe** (encontrado en `Downloads/Mis Gastos - Google Play package/`), lo que elimina el riesgo crítico que el plan marcaba para esta fase: sin él, actualizar el APK habría exigido desinstalar, y desinstalar borra los datos del WebView.

**Decisión.** `.gitignore` bloquea `*.keystore`, `*.jks`, `signing-key-info.txt`, `*.apk` y `*.aab`.

**Por qué es una regla y no una advertencia.** El repositorio es público. Quien tenga el keystore puede firmar una app que Android acepta como actualización legítima de ésta. Y subirlo **una sola vez** lo deja en el historial de git de forma permanente: borrarlo en un commit posterior no lo retira: habría que rotar la clave, y rotar la clave obliga a desinstalar la app, que es exactamente el desastre que se quiere evitar.

---

## ADR-018 — Archivar una categoría reasigna sus movimientos; nunca se borra físicamente

**Decisión.** `archiveCategory(id, reassignTo?)` marca `archivedAt` **y** mueve todos los movimientos que la usaban a la categoría destino (o a `sys_sin_categoria` si el usuario no elige ninguna). Las subcategorías hijas se archivan con ella, y los movimientos reasignados pierden su `subcategoryId`.

**Por qué no un borrado físico.** Dejaría cientos de movimientos apuntando a un id inexistente: no desaparecen de la lista, pero sí de todo desglose por categoría, y su gasto deja de sumar en los informes sin que nada avise. El usuario descubriría el agujero semanas después, cuadrando un mes.

**Por qué reasignar es obligatorio y no opcional.** Un movimiento apuntando a una categoría *archivada* tiene el mismo problema en menor grado: sigue existiendo pero se vuelve invisible en los desgloses. Por eso el store reasigna siempre, con o sin destino elegido.

**Por qué se pierde la subcategoría al reasignar.** «Mercado» pertenece a «Comida»; si el gasto pasa a «Otros», conservarla dejaría una subcategoría que no cuelga de su categoría. Archivar sólo la subcategoría sí conserva el nivel 1 — se pierde el detalle, no la clasificación.

**La interfaz muestra el número de movimientos afectados antes de confirmar.** Sin ese dato, alguien archiva «Comida» creyéndola vacía y reclasifica 200 gastos sin enterarse.

**Verificado en navegador** sobre la build de producción: archivar «Comida» (2 movimientos) con destino «Otros» dejó 10 movimientos antes y 10 después, los 2 en «Otros», la categoría archivada pero presente en los datos, y fuera del formulario de movimientos.

---

## ADR-019 — Paleta cerrada e iconos curados, no selectores libres

**Decisión.** `ColorPicker` ofrece los 16 colores de `PALETTE`; `IconPicker` ofrece `PICKABLE_ICONS`, un subconjunto del registro.

**Por qué no `<input type="color">`.** Deja elegir los 16 millones, incluidos los que hacen el texto ilegible encima o desaparecen contra el fondo oscuro. Con una paleta comprobada, cualquier elección se ve bien y la app conserva un aspecto coherente en vez de un arcoíris accidental.

**Por qué los iconos son un subconjunto y no `Object.keys(ICON_REGISTRY)`.** Ofrecer los de navegación o los de acción permitiría poner una papelera o una flecha de "atrás" como icono de una categoría. Tampoco se ofrece `cat-ajuste`: es de la categoría de sistema, y verlo repetido haría ilegible el historial de ajustes.

**El caso que no se podía romper: los emojis heredados.** Las categorías migradas de v1 guardan un emoji en `icon` (`'🍔'`), no una clave del registro. Si el selector sólo mostrara sus opciones, el usuario abriría el formulario, no vería nada marcado, y al tocar cualquier icono perdería su emoji sin haberlo pedido. `IconPicker` antepone el valor actual cuando no reconoce la clave, lo marca como seleccionado y lo explica.

---

## ADR-020 — "Ajustar saldo" y "Cambiar saldo inicial" son dos operaciones distintas

Se parecen tanto —las dos son un campo de importe que mueve el saldo— que confundirlas es fácil, y hacen cosas opuestas:

| | Ajustar saldo | Cambiar saldo inicial |
|---|---|---|
| Qué hace | Registra un movimiento fechado hoy | Reescribe el punto de partida |
| El pasado | Intacto | **Cambia retroactivamente** |
| Reversible | Sí: borras el movimiento | No: hay que volver a escribir el valor anterior |
| Deja rastro | Sí, en el historial | No |
| Informes anteriores | No cambian | **Cambian todos** |
| Crea un movimiento | Sí | **No** |

**Ajustar saldo es lo que el usuario quiere casi siempre**: la cuenta no cuadra HOY y hay que cuadrarla. Cambiar el saldo inicial sólo tiene sentido si el punto de partida estaba mal desde el principio — típicamente, una cifra mal tecleada al crear la cuenta.

**Cómo se distinguen en la interfaz.** No basta con nombrarlas distinto: las dos filas del detalle llevan una frase que dice qué hacen ("Cuadra la cuenta con lo que dice tu banco hoy. Reversible." / "Corrige el punto de partida. Reescribe el pasado."), el formulario peligroso abre con un aviso **antes** del campo —leerlo después de teclear la cifra sería leerlo cuando ya has decidido—, y muestra la previsión exacta (`$2.688.000 → $2.988.000`) antes de confirmar. El botón es `danger` y dice "Reescribir", no "Guardar".

**Verificado en la build de producción:** cambiar el inicial de 1.200.000 a 1.500.000 movió el saldo actual exactamente +300.000, **sin crear ningún movimiento** (10 antes, 10 después) — que es la diferencia observable con el ajuste — y el número anunciado coincidió con el resultado.

---

## ADR-021 — Las acciones de una cuenta viven sólo en su detalle

**Decisión.** Tocar una cuenta en la lista navega a `/cuentas/:accountId`. La lista ya no abre una hoja de acciones.

**Por qué se quitó de la lista.** Durante la Fase 8, ajustar/editar/desconectar existían en la hoja de la pantalla de Cuentas. Al añadir el detalle en la Fase 12, las mismas operaciones habrían quedado en dos sitios: dos confirmaciones que mantener sincronizadas y que acaban divergiendo — exactamente el patrón que causó el descuadre de v1, donde el saldo se actualizaba a mano en varias ramas distintas.

**Lo que aporta el detalle.** La lista responde "cuánto tengo"; el detalle responde **por qué**. Con el saldo derivado, un número que no se puede editar a mano desconcierta si no se explica de dónde sale, así que la cabecera muestra la operación entera: `inicial + ingresos − gastos ± ajustes = saldo`. Los ajustes van en su propia línea, separados: mueven el saldo pero no son dinero ganado ni gastado.

**Bancos como entidades.** Renombrar un banco cambia el rótulo de todas sus cuentas a la vez, porque éstas guardan su `bankId` y no una copia del nombre. En v1 el nombre se copiaba dentro de cada cuenta (`bankName`), así que renombrar exigía editarlas una a una y "Otro banco" no se podía reutilizar.

---

## ADR-022 — Los campos secundarios del movimiento van plegados

**Decisión.** Hora, subcategoría y observaciones existen, pero detrás de "Más detalles". Al **editar** un movimiento que ya los tiene rellenos, la sección se abre sola.

**Por qué.** El caso normal es anotar un gasto en la cola del supermercado: importe, categoría y poco más. Con siete campos a la vista, anotar deja de ser rápido — y una app de gastos que cuesta usar se deja de usar, que es un fallo peor que no tener el campo. Plegarlos conserva la función sin cobrarle el coste a quien no la necesita.

**La excepción importa tanto como la regla:** esconder datos que ya existen sería peor que mostrarlos. Si el movimiento trae notas, subcategoría o una hora distinta de `00:00`, la sección arranca abierta.

**Consecuencia del orden por `fecha + hora`.** Los movimientos migrados de v1 llegan todos con `'00:00'`, porque v1 no guardaba la hora. Sin desempate, un día lleno de `'00:00'` tendría orden indeterminado y la lista se barajaría sola entre renders — parece un fallo grave aunque los datos estén bien. `txSortKey` desempata por `createdAt`, y hay tests que fijan la estabilidad del orden. `formatDateTime` omite la hora cuando vale `'00:00'`: mostrarla en cientos de movimientos antiguos sería ruido que además sugiere una precisión que el dato no tiene.

**La subcategoría se limpia al cambiar de categoría**, en el formulario igual que en el store (ADR-018): "Gasolina" pertenece a "Transporte", y arrastrarla a "Salud" dejaría un nivel 2 que no cuelga de su nivel 1.

---

## ADR-023 — La búsqueda ignora tildes y combina las palabras con Y

**Decisión.** El texto se normaliza (minúsculas + `NFD` sin marcas combinantes) antes de comparar, y la consulta se trocea en palabras que deben aparecer **todas**.

**Por qué sin tildes.** La app es en español y se usa en un móvil. Escribir "café", "cumpleaños" o "Bogotá" con su tilde exige cambiar de teclado o mantener pulsada una tecla: nadie lo hace mientras busca. Con comparación literal, buscar `cafe` no encontraría "Café" y la lectura obvia es que el movimiento se perdió. El dato guardado no se toca nunca: la normalización sólo ocurre al comparar.

**Efecto colateral aceptado:** la `ñ` también se descompone, así que "año" y "ano" se vuelven el mismo término *al buscar*. Es una búsqueda más indulgente —"nino" encuentra "niño"—, que es lo que se quiere de un cuadro de búsqueda.

**Por qué Y entre palabras.** Con O, teclear una segunda palabra **ampliaría** los resultados en vez de acotarlos: lo contrario de lo que espera quien sigue escribiendo para afinar. Con Y, además, el orden da igual: `taxi aeropuerto` y `aeropuerto taxi` encuentran "Taxi al aeropuerto" pese al "al" que nadie escribió.

**Dónde busca:** descripción, observaciones y los **nombres** de categoría, subcategoría y cuenta. Buscar sólo en la descripción sería inútil aquí — la mayoría de movimientos se anotan sin ella, así que lo único que los identifica es su categoría. Verificado: `salud` encuentra "Farmacia"; `efectivo` encuentra los 3 movimientos de esa cuenta.

**Dónde NO busca: el importe.** Es tentador y es un error. Los importes son cadenas de dígitos largas y cualquier consulta corta coincidiría con casi todo: escribir `5` devolvería los de 5.000, 50.000, 15.000, 250.000… la lista entera, justo cuando el usuario cree estar acotando. Para eso está el filtro de rango, que sí dice lo que hace.

---

## ADR-024 — Los criterios viven en el store; el texto se retrasa al consumirlo, no al escribirlo

**Decisión.** `filters` y `search` viven en `uiSlice`. El cuadro de búsqueda escribe en el store **en cada tecla**; lo que se retrasa 200 ms (`useDebouncedValue`) es el valor que alimenta el filtrado.

**Por qué en el store y no en `useState`.** La barra, la hoja y las fichas de criterio activo leen y escriben los mismos filtros. Con estado local habría que bajarlo por props a través de los tres, y cada uno tendría su propia oportunidad de desincronizarse. Con una sola fuente, quitar una ficha y desmarcar su casilla en la hoja son literalmente la misma escritura.

**Y no se persiste.** `uiSlice` está fuera de lo que se guarda. Reabrir la app con un filtro de la sesión anterior enseñaría una lista recortada sin que nada explique por qué.

**Dónde va el retraso.** Retrasar lo que se *escribe* daría el peor resultado posible: las letras aparecerían 200 ms después de teclearlas y el campo se percibiría roto. Se retrasa lo que se *consume*. Por eso `uiSlice.search` (lo que se ve) y `filters.search` (lo que se aplica) son campos distintos, y no una duplicación.

**Por qué 200 ms.** Escribiendo rápido en un móvil salen ~5 pulsaciones por segundo, así que 200 ms agrupa casi todas las ráfagas sin llegar a sentirse como espera (por debajo de ~250 ms la respuesta se percibe inmediata).

**Se filtra en dos pasos** —criterios primero, texto después sobre el resultado— porque los criterios cambian con un toque y el texto con cada tecla: teclear sólo repite la búsqueda sobre la lista ya recortada.

---

## ADR-025 — La hoja de filtros aplica en vivo y no tiene "Aceptar"

**Decisión.** Cada toque modifica los criterios de inmediato y el botón inferior va contando lo que queda ("Ver 12 movimientos"). No hay Aceptar/Cancelar. La hoja **no guarda estado propio**: ni un `useState`.

**Por qué.** El recuento es información que hace falta *mientras* se elige, no después. Con un botón "Aplicar" hay que cerrar, mirar, volver a abrir y corregir por cada criterio de más. Verificado en vivo: marcar Gastos → Cuenta principal → Comida → Mes llevó el botón de 16 → 13 → 5 → 2 → 1 movimiento.

**El precio es que no hay "Cancelar".** Se compensa con "Limpiar todo" siempre a mano, con que cada ficha se desmarca sola, y con que nada de lo que se hace aquí toca un solo dato guardado.

**Sin copia local de los filtros** porque habría dos versiones de la verdad, y bastaría abrir la hoja con filtros ya puestos para verlas discrepar.

**Las subcategorías sólo aparecen si hay una categoría marcada**, y al desmarcar la categoría padre **se limpian las suyas del filtro**. Sin esa limpieza, un filtro de subcategoría seguiría descartando movimientos desde una sección que ya no se ve: un filtro invisible que no devuelve nada es el fallo que más se parece a "la app perdió mis datos". Verificado: desmarcar «Comida» con «Mercado» activa devolvió la lista a 16 y dejó la sección vacía, en vez de quedarse en 1 sin explicación.

---

## ADR-026 — Dos señales impiden que un filtro se vuelva invisible: la insignia y las fichas

**Decisión.** El botón de filtros lleva una insignia con el número de **ejes** activos, y bajo la barra hay una ficha **por valor**, cada una con su X.

**El fallo que evitan.** Los filtros viven dentro de una hoja: una vez cerrada, nada en pantalla dice que la lista está recortada. El usuario ve menos movimientos de los que tiene, concluye que se borraron, y no tiene forma de averiguar por qué. La insignia dice *cuántos* criterios hay; las fichas dicen *cuáles*. Y una ficha por valor —no por eje— permite quitar una sola categoría sin volver a abrir la hoja.

**La insignia cuenta ejes, no claves.** Detectado al verificar en el navegador: contando claves, elegir el atajo "Mes" ponía un **2** en la insignia (pone `dateFrom` y `dateTo`) mientras abajo aparecía **una** sola ficha con el rango. Dos números distintos describiendo lo mismo, en la misma pantalla, y ninguno claramente equivocado a ojos de quien mira: la clase de detalle que hace desconfiar de toda la app. `FILTER_AXES` agrupa `dateFrom`/`dateTo`/`month`/`year` como "cuándo" y `amountMin`/`amountMax` como "cuánto". Hay un test que fija el invariante *insignia ≤ fichas*.

**El denominador de la pista también se corrigió.** "1 de 17" aparecía mientras la lista sin buscar decía "16 movimientos" — el 17 incluía un ajuste de saldo que el usuario no puede ver en ninguna circunstancia. Ahora el denominador es *lo que había antes de escribir*: "2 de 5" dentro de los filtros puestos.

**Quitar el último valor de una lista borra el criterio** en vez de dejar `[]`. Una lista vacía no filtra nada (los predicados tratan lo ausente como "sin restricción"), así que el criterio seguiría contando en la insignia sin tener ningún efecto: el botón diría "1 filtro" con cero filtros aplicados.

---

## ADR-027 — La regla de los ajustes se mudó de la pantalla al servicio

**Decisión.** `applyFilters` decide por sí solo que filtrar **por** la categoría "Ajuste de saldo" implica mostrarlos (`resolveIncludeAdjustments`). Un `includeAdjustments` explícito sigue ganando.

**Por qué se movió.** En la Fase 8 esa regla estaba escrita dentro de `TransactionsScreen`, así que sólo valía allí: cualquier otra vista que filtrara por esa categoría habría mostrado una lista vacía, y los ajustes habrían quedado registrados e invisibles — imposibles de revisar y, sobre todo, de **borrar**, que es lo que los hace reversibles y lo que promete el aviso al crearlos.

**Verificado en la build de producción:** un ajuste de +$50.000 aparece al filtrar por su categoría y el resumen de la lista sigue diciendo `$0 · $0` — visible pero fuera de ingresos y gastos, que es el invariante que impide que vuelva la queja original.

---

## ADR-028 — Las cinco tarjetas indicadoras son FLUJO; ningún saldo entra en la rejilla

**Decisión.** El Inicio muestra el saldo total arriba, solo y rotulado como lo que es, y debajo cinco indicadores que responden todos a "qué pasó durante el periodo": gasto medio al día, categoría principal, mayor gasto, tasa de ahorro y número de movimientos.

**Por qué la regla es "ninguno es un saldo".** Meter un stock en esa rejilla reproduciría el error de v1 en pequeño: una cifra que baja con cada gasto bajo un rótulo que no habla de gastos. La separación se nota al usar la app — **las cinco cifras cambian al tocar una pestaña y el saldo total no**. Verificado: Hoy/Semana/Mes dan tres juegos distintos de indicadores con el mismo `$3.180.000` arriba.

**El promedio diario se divide entre los días TRANSCURRIDOS, no entre los del periodo.** Lo evidente —`gasto / 31`— hace inútil el dato justo cuando se mira, que es a mitad de mes: el 2 de agosto con 186.000 gastados diría "6.000 al día". El número no estaría mal calculado, estaría respondiendo a "cuánto habrás gastado al día si no gastas nada más en todo el mes", que nadie preguntó. Es el mismo criterio de truncado que usará la comparación entre periodos de la Fase 16.

**`null` no es cero.** Un promedio sin días transcurridos y una tasa de ahorro sin ingresos no valen 0: no se pueden calcular. Se pintan «—», atenuado. Escribir "0%" ahí afirmaría algo falso —"no ahorraste nada"— cuando lo cierto es que no entró dinero que ahorrar. Nunca `Infinity` ni `NaN`.

**La tasa de ahorro puede ser negativa y no se recorta.** "−88%" dice algo que "0%" oculta.

---

## ADR-029 — Qué gráfica para qué pregunta (y por qué una de ellas no es una tarta)

**Decisión.** Cinco gráficas en orden de lo concreto a lo general: dona de gasto por categoría, barras de gasto diario, comparada de ingresos vs. gastos por mes, evolución del saldo, y reparto del saldo entre cuentas. Las dos últimas son STOCK y van al final, después de las de flujo.

**Ingresos y gastos van UNA AL LADO DE OTRA, nunca apiladas.** Apilarlas volvería a sugerir que una se resta de la otra dentro de la misma barra, que es exactamente la confusión de v1. Dos barras separadas dicen lo único cierto: son dos flujos independientes.

**El reparto por cuenta no es una tarta, y no usa Recharts.** Dos razones, ninguna estética:
1. *Una tarta no puede representar deudas.* Con +3.400.000 en ahorros y −420.000 en la tarjeta, la porción de la tarjeta sería negativa: las porciones sumarían más del 100% y el dibujo sería sencillamente falso. `accountDistribution` calcula el porcentaje **sólo sobre los saldos positivos** y marca las deudas con `isDebt`, que se pintan en rojo y con su importe, sin fingir ser una fracción de un dinero que no existe.
2. *Ya hay una dona en esa pantalla.* Dos donas seguidas se confunden de un vistazo, y la segunda respondería a una pregunta distinta —stock, no flujo— con la misma forma.

Al ser barras proporcionales sale más barato y más accesible en HTML+CSS que en SVG: cada fila es texto real, y no añade un byte a la librería de gráficos.

**El eje Y de la evolución del saldo no empieza en cero.** Con saldos de siete cifras y variaciones del 3%, un eje anclado en 0 dibuja una línea plana que no informa de nada. Se compensa mostrando los valores de los extremos y una línea de cero cuando el saldo llega a ser negativo.

**`buildBalanceTimeline` se calcula en una pasada, no en una por día.** Lo evidente —para cada día, sumar todo lo anterior— son 30 recorridos completos del historial en cada render de la pantalla de arranque. Aquí una sola pasada reparte cada movimiento en tres cajas (antes de la ventana, dentro, después) y un recorrido por días acumula: O(movimientos + días). El saldo de apertura no es opcional: sin él la línea arrancaría en 0 y subiría hasta el saldo real, dibujando una ganancia que nunca existió.

---

## ADR-030 — Tres correcciones de coherencia detectadas en la Fase 15

**`accountDistribution` vive en `services/balance`, no en `services/metrics`.** El plan lo situaba en metrics; es un error del plan. La función lee saldos, y `services/metrics` tiene prohibido por regla de ESLint importar `services/balance` (ADR-003). Colocarlo allí habría obligado a pasarle los saldos ya calculados desde fuera —esquivando la regla sin quebrantarla— y a dejar una función de "métricas" cuyo dato de entrada es justo el que ese directorio no debe manejar.

**El Inicio ya no repite la suma del saldo total.** `useTotalBalance()` existía desde la Fase 5 y la pantalla lo reimplementaba a mano en un `useMemo`. Dos sitios calculando el mismo número es la forma exacta que tenía el descuadre de v1 de colarse, y desde esta fase importa más: la línea de "Evolución del saldo" termina en esa misma cifra, así que dos cálculos independientes podrían discrepar en la misma pantalla.

**`PERIOD_PHRASES` no es `PERIOD_LABELS` en minúsculas.** Las pestañas se rotulan "Hoy / Semana / Mes / Año" porque tienen que caber en cuatro botones; esos mismos rótulos metidos en una frase daban **"Sin gastos en semana"** e **"INDICADORES DE MES"**. Una app en la que se lee eso parece traducida a máquina, y el usuario deja de confiar en lo que dice justo al lado de sus cifras. Se detectó al cambiar de pestaña durante la verificación, no al escribir el código, porque con la pestaña por defecto ("Hoy") la frase salía bien.

**Bonus del mismo repaso:** el eje de la evolución del saldo rotulaba "6 Aug" junto a "9 jul" — `date-fns` sin `locale: es` escribe en inglés, y sólo se nota en los meses cuyo nombre difiere. Es decir: casi nunca al desarrollar, y siempre en producción.

---

## ADR-031 — El periodo anterior se recorta al mismo tramo transcurrido

**Decisión.** Un periodo en curso se compara contra el **mismo número de días** del anterior, no contra el anterior completo. El rótulo lo dice: *"vs. mismos días del mes pasado"*.

**El problema, que es de honestidad y no de cálculo.** El 7 de agosto llevas 655.000 gastados; julio entero fueron 1.915.000. Comparar esas dos cifras da "−66%" y un cartel verde de enhorabuena — por llevar siete días de mes. El día 31 el mismo cartel se habrá dado la vuelta sin que hayas cambiado un hábito. Los dos números están bien; lo que está mal es presentarlos como comparables. Una app que felicita al usuario por gastar poco a principios de mes, **todos los meses**, enseña a ignorar sus propios avisos.

Verificado en la build de producción con datos donde julio tuvo 285.000 en sus primeros 7 días y 1.915.000 en total: la app muestra **+130%** contra el tramo correcto, no −66% contra el mes entero, y escribe debajo *"Comparado con 1 jul – 7 jul: $2.400.000 de ingresos y $285.000 de gastos"* para que la cifra se pueda comprobar en vez de tener que creerla.

**Se cuentan días, no se copia la fecha.** Truncar "hasta el mismo día del mes" se rompe solo: el 31 de marzo no existe en febrero. Contando días transcurridos, el recorte topa con el final del periodo anterior sin ningún caso especial, y resuelve igual de bien el año bisiesto y la semana que cruza el cambio de año. Hay tests para los cinco bordes.

**`sameLength` no significa "la comparación es justa".** Julio completo (31 días) contra junio completo (30) da `false` y es la comparación mensual de toda la vida: avisar cada mes de 31 días sería ruido. Lo que importa es `isPartial && !sameLength` — el 30 de marzo, con 30 días transcurridos contra los 28 de febrero. Sólo entonces aparece el aviso.

**El periodo actual se muestra completo** (1–31 de agosto), igual que en el Inicio: si las dos pantallas definieran "este mes" de forma distinta, sus totales no cuadrarían. Junto al rango se dice cuántos días llevas, porque si no quedaba un "3 – 9 ago" al lado de un "comparado con 27 – 31 jul" y la resta no salía.

---

## ADR-032 — La aritmética no opina; el color sí

**Decisión.** `comparePeriods` devuelve la dirección desnuda (`up`/`down`/`flat`). Es `ComparisonBadge` quien decide si eso es bueno, mediante una prop `polarity`.

**Por qué.** Un +20% en ingresos es buena noticia; un +20% en gastos es la contraria. Si el color se decidiera en el servicio, la aritmética tendría que saber qué es un "gasto", y bastaría reutilizarla para otra métrica para que los colores salieran al revés sin que nada fallara.

**La flecha y el color codifican cosas distintas, a propósito.** La flecha dice si el número subió o bajó; el color, si eso conviene. Gastar un 30% menos sale con flecha **abajo** y en **verde**. Fundirlos —flecha arriba siempre que "va bien"— haría que el gesto contradijera la cifra que tiene al lado.

**División por cero → `null` → «—».** Las tres salidas tentadoras son mentira: `Infinity` se pinta tal cual, `100%` afirma que se duplicó algo que no había, `0%` afirma que no cambió nada cuando cambió todo. El importe absoluto sí se conserva: *"sin datos del mes pasado, +$340.000"* informa; *"+∞%"* no. Es el caso **normal** del primer mes de uso, no un borde exótico — verificado: las pestañas Semana y Año lo muestran correctamente con datos que sólo cubren agosto.

**El denominador va en valor absoluto.** Con un balance anterior negativo, dividir por él invertiría el signo: pasar de −100.000 a −200.000 (empeorar) saldría como "+100%" de mejora.

---

## ADR-033 — Seguimiento es una pantalla, no cuatro pestañas-componente

**Decisión.** El plan preveía `DailyTab`, `WeeklyTab`, `MonthlyTab` y `YearlyTab`. Se implementa una sola pantalla con el *bucket* de la serie parametrizado.

**Por qué se desvía del plan.** Serían cuatro archivos idénticos salvo en una línea —qué se agrupa— y por tanto cuatro sitios donde arreglar cada fallo y tres oportunidades de olvidarse. Es exactamente el "no dejes archivos duplicados" que gobierna esta reescritura.

**La vista diaria no tiene gráfica.** Una serie de un solo punto no es una gráfica: no informa de nada y ocupa igual. El día muestra sus movimientos, que es lo que se quiere ver al mirar un día concreto. Semana y mes se agrupan por día; el año, por mes.

**La serie diaria se recorta hasta hoy.** Dibujar los veinticuatro días que faltan del mes como barras a cero sugiere que no se gastó nada en ellos, cuando lo cierto es que aún no han ocurrido.

**El ranking de categorías no es otra dona.** El Inicio ya tiene una y responde a "¿cómo se reparte?". Ésta responde a "¿cuánto exactamente, y en qué orden?", que en una dona exige medir ángulos. Además no arrastra Recharts, así que pinta con la pantalla en vez de esperar al chunk diferido — y muestra **todas** las categorías, sin recortar a seis: aquí el usuario viene expresamente a revisar.

---

## ADR-034 — El fallback de iconos ahora avisa en desarrollo

**Problema encontrado en la Fase 16.** `<Icon name="scale">` pintó la palabra **"scale"** en medio de la fila "Balance" de Seguimiento. La clave no estaba en `ICON_REGISTRY`, y el fallback a texto —que existe para los emojis heredados de v1 (ADR-011)— la aceptó sin rechistar.

**El fallback es correcto y se mantiene**: es lo que permite que los iconos del usuario sobrevivan sin migrar un solo dato. Lo que faltaba era distinguir un emoji heredado de una errata. Los valores heredados son emojis, nunca identificadores ASCII: si la clave *parece* una clave y no está registrada, es un error de escritura. Ahora `Icon` lo avisa por consola en desarrollo. En producción no se avisa —no serviría de nada al usuario— y el comportamiento no cambia.

---

## ADR-035 — El CSV está hecho para Excel en español, y eso son tres decisiones

**Generar un CSV parece trivial y tiene tres trampas.** Las tres producen un archivo que **abre sin error y muestra basura**, que es el peor fallo posible: el usuario no sabe que tiene que desconfiar.

**1. El separador no es la coma.** Excel usa el separador de la configuración regional; en español es el **punto y coma**, porque la coma es el separador decimal. Un CSV con comas se abre en es-CO con todo amontonado en la columna A.

**2. Sin BOM las tildes se rompen.** Excel para Windows no detecta UTF-8 al abrir un `.csv` por doble clic: asume Windows-1252 y "Café" sale como "CafÃ©". Son tres bytes (`EF BB BF`) y afectan a casi todas las filas de una app en español. Verificado sobre los bytes reales del blob, no sobre el texto: `Blob.text()` descarta el BOM al decodificar, así que comprobarlo ahí habría dado un falso negativo.

**3. Inyección de fórmulas.** Una celda que empieza por `=`, `+`, `-` o `@` la interpreta Excel como **fórmula**. Aquí el texto lo escribe el propio usuario, así que el ataque es remoto — pero el accidente no: quien anote "-500 de descuento" vería su descripción convertida en un número. Se antepone un apóstrofo, que Excel usa justamente para forzar texto.

**El error que cometí y que atrapó el test:** la primera versión aplicaba la guarda a **todo**, así que un gasto de −47.000 salía como `'-47000` y Excel lo trataba como texto — **`SUMA()` habría devuelto cero**, exactamente el fallo que la exportación existe para evitar. La guarda protege el texto del usuario; los números los genera la app y no pueden contener una fórmula. Ahora se distinguen **por tipo, no por su aspecto**: `csvCell` recibe el número crudo y lo formatea él, así que no hay dónde equivocarse en la llamada.

**El importe va con signo** (negativo en los gastos). El modelo guarda siempre positivo y el signo en `type`, que es lo correcto para la app — pero quien exporta a Excel lo hace para sumar, y una columna de positivos exige una fórmula con condición antes de totalizar nada.

**Los ajustes de saldo se marcan, no se ocultan:** si faltaran, la suma del CSV no cuadraría con el saldo que muestra la app.

---

## ADR-036 — Reportes no tiene matemática propia

**Decisión.** Todas las cifras de Reportes —y las del CSV— salen de `services/metrics` y `services/periods`. Ni una suma escrita en la pantalla ni en el exportador.

**Por qué.** Si Reportes calculara por su cuenta, tarde o temprano el informe y la pantalla dirían cifras distintas y no habría manera de saber cuál creer. Es el género exacto de fallo que originó esta reescritura.

**Verificado en la build de producción**, comparando pantalla contra pantalla: Reportes y Seguimiento sobre el mismo mes dan `$2.400.000 / $680.000 / $1.720.000` y **el ranking de categorías completo idéntico, entrada por entrada**. Y en los tests, la suma de la columna *Importe* del CSV es exactamente `periodTotals(...).net`.

---

## ADR-037 — Los filtros se separan por ámbito, no por pantalla ni por copia

**Decisión.** `uiSlice.filters` pasa de ser un juego único a `Record<FilterScope, TransactionFilters>`, con `'transactions'` y `'reports'`. Cada pantalla usa `useScopedFilters(scope)`, que devuelve las acciones ya atadas.

**Las dos alternativas fallaban, cada una por su lado.** Compartir un solo juego significa que acotar un informe para exportarlo recorta en silencio la lista de Movimientos: un filtro que aparece donde nadie lo puso es indistinguible de datos perdidos. Y llevarlos en `useState` local en Reportes —que fue la primera implementación— aislaba bien pero **los perdía al tocar cualquier pestaña de la barra inferior**, y montar un informe con cuatro criterios cuesta bastante más que anotar un gasto.

Verificado en las dos direcciones: con "Tarjeta Nu" puesto en Reportes, Movimientos sigue mostrando sus 10 movimientos sin ninguna ficha; con "Comida" puesto en Movimientos, Reportes conserva "Tarjeta Nu". Y volver a Reportes recupera su filtro y su total ($152.000).

**Por qué un hook y no pasar el ámbito en cada llamada.** Sin él, cada pantalla escribiría la cadena `'reports'` en siete sitios, y basta copiar una línea de la otra pantalla sin cambiarla para que Reportes escriba en los filtros de Movimientos. El fallo no daría ningún error: la otra pantalla aparecería filtrada sola.

**Y la regla de fusión se comparte.** `applyFilterPatch` —que borra las claves puestas a `undefined` en vez de dejarlas dentro (ADR-026)— vive en `services/filters` y la usan el slice y cualquier otro dueño. Escrita dos veces, un día divergirían.

---

## ADR-038 — El tema se aplica antes del primer píxel, y eso obliga a duplicar tres líneas en `index.html`

**Contexto.** El tema claro existía desde la Fase 2 pero no se podía elegir: `App.tsx` traducía la preferencia a `data-theme` en un efecto, y `'system'` caía siempre en oscuro. La Fase 18 añade el selector y engancha `prefers-color-scheme`.

**El problema que aparece al hacerlo.** El CSS por defecto es oscuro y `data-theme` lo pone React. Para quien elija el tema claro, cada arranque pinta la pantalla oscura, descarga el módulo, hidrata los datos y sólo entonces cambia: un **parpadeo negro** en cada apertura. En la app instalada, que ya viene de una pantalla de bienvenida, se ve perfectamente.

**Decisión.** Un script de 12 líneas en el `<head>` de `index.html`, antes de cualquier `<script type="module">`. Lee la preferencia, resuelve `'system'` y pone `data-theme` antes de que el navegador pinte nada.

**El coste, dicho en claro: duplica tres cosas** que también viven en `src/` — la clave `gastos_app_data_v2`, el tema por defecto y la regla de `'system'`. No hay alternativa: en el `<head>` no se pueden importar módulos, y cualquier `import` sería una descarga más, que es exactamente lo que devuelve el parpadeo.

Lo que sí se puede hacer es que la duplicación no se pudra en silencio. `src/constants/storageKeys.test.ts` lee `index.html` y comprueba las tres. Sin ese test, el día que cambie `STORAGE_KEY` —una migración v2→v3— el script leería la clave vieja y el fallo sería de los peores: no rompe nada, no da error, sólo devuelve el parpadeo. Nadie lo ataría a un cambio de constantes hecho meses antes.

**`'system'` pregunta por CLARO, no por oscuro.** `(prefers-color-scheme: dark)` y `(prefers-color-scheme: light)` fallan las dos cuando el sistema no expresa preferencia. Preguntando por claro, ese caso cae en oscuro — el tema por defecto y el que el usuario ya tiene instalado. Al revés, cambiaría de aspecto en dispositivos que no dijeron nada. El script del `<head>` y `useSystemColorScheme` usan la misma consulta, y el test lo verifica.

**El color de la barra de estado se lee del token, no se escribe a mano.** `useAppliedTheme` pone `<meta name="theme-color">` con el valor calculado de `--color-surface` justo después de cambiar `data-theme`. Con un hex literal, retocar la paleta dejaría la franja del sistema con el color viejo — un borde de otro color pegado al borde de la app, imposible de encontrar leyendo el CSS.

---

## ADR-039 — `SegmentedControl`: los roles ARIA describen un widget, no lo implementan

**Contexto.** `PeriodTabs` decía en su comentario que era un `radiogroup` navegable con flechas. Era falso: `role="radio"` sobre un `<button>` le dice al lector de pantalla que es una opción, pero no aporta ningún comportamiento. Tab pasaba por las cuatro opciones una a una y las flechas no hacían nada.

**Decisión.** Extraer `components/ui/SegmentedControl` con el comportamiento real de un grupo de radios: `tabIndex` móvil (sólo la opción marcada vale 0), flechas que mueven selección y foco a la vez con vuelta al principio, y `Home`/`End`.

**Por qué ahora y no en la Fase 2.** Hasta esta fase había un único uso. El selector de tema es el segundo, y con dos copias el teclado sólo funciona bien en la que alguien se acuerde de arreglar (ADR-011: un componente compartido se crea cuando aparece el segundo uso real, no antes).

**Detalle que sólo se ve probándolo.** El desplazamiento se calcula desde la opción **enfocada**, no desde la marcada. Normalmente son la misma, pero si dejan de serlo la flecha saltaría a un sitio que no está al lado de lo que el usuario tiene delante. Y el foco se mueve siempre, aunque la opción ya estuviera marcada: si no, una flecha que cae sobre la opción actual no haría nada y el recorrido se quedaría atascado ahí.

Verificado con pulsaciones reales de teclado: `-1,-1,0,-1` de partida, vuelta al principio en los dos sentidos y `Home`/`End` correctos.

---

## ADR-040 — La transición de pantalla anima `<main>`, no el enrutado

**Contexto.** Falta una transición al cambiar de pestaña. Lo natural es envolver `<Routes>`.

**Por qué eso está mal.** La animación usa `transform`, y un elemento transformado se convierte en el bloque contenedor de sus descendientes `position: fixed`. El FAB es fixed y se renderiza dentro de la pantalla: envolviendo el enrutado, durante los 200 ms de la animación se anclaría al fondo del **contenido** —que en una lista larga está muy por debajo de la ventana— y volvería de un salto al terminar.

**Decisión.** La animación vive en `ScreenContainer`, es decir sólo en `<main>`. El FAB y la barra superior quedan fuera y no se mueven, que además es lo que hace una app nativa: la cabecera se queda quieta y el contenido entra.

Verificado midiendo el FAB en pleno vuelo y al terminar: 84 px desde abajo en los dos momentos, con `matrix(1, 0, 0, 1, 0, 8)` aplicado a `<main>`.

**El salto al principio va con la transición, y no es un extra.** Sin él, ir de una lista de movimientos con scroll a una pantalla corta deja la ventana desplazada y la nueva pantalla aparece en blanco. Se omite cuando la navegación es `POP` (botón Atrás): ahí el usuario espera reencontrar el sitio donde estaba.

`prefers-reduced-motion` la anula desde `reset.css`, que ya reduce toda animación a 0,01 ms con `!important`.

---

## ADR-041 — Nivel de encabezado y tamaño de letra responden a preguntas distintas

**Contexto.** Un barrido de accesibilidad encontró dos cosas a la vez: saltos de `h1` a `h3` en Seguimiento y Reportes, y cinco tratamientos tipográficos distintos para lo que era el mismo nivel de sección.

**Decisión.** Dos reglas separadas:

- **Nivel** (estructura del documento): `h1` es el título de pantalla, en la barra superior. `h2` es toda sección de primer nivel dentro de `main`. `h3` queda para lo que cuelga de un `h2` — los grupos de la hoja de filtros, que cuelgan del `h2` del propio diálogo.
- **Tamaño** (peso visual): las secciones de pantalla van a 16 px en negrita. Es el tratamiento que ya tenían "Cuentas", "Movimientos recientes" y las tarjetas de Ajustes; se alinean con él "En qué se fue", "Exportar" y las gráficas.

**La cejilla de "Indicadores de este mes" se retira.** Eran 12 px en mayúsculas entre dos vecinas de 16 px en negrita: se leía como el pie de la sección anterior en vez de como el título de ésta. El Inicio tenía tres secciones al mismo nivel y una parecía un anexo. La cejilla es un recurso válido para un rótulo **dentro** de un bloque, no para el rótulo del bloque.

**Y una excepción documentada.** "Subcategorías" es `h2` pero se ve a 15 px semi-negrita. El nivel responde a la estructura —no hay ningún encabezado por encima al que colgarse, porque el nombre de la categoría vive dentro de un botón y un botón no puede contener un encabezado— mientras que el tamaño responde al peso que merece el bloque. A 16 px en negrita gritaría más que el nombre de la categoría que lo contiene.

---

## ADR-042 — Las ilustraciones de estado vacío son SVG en línea, y sólo cuatro

**Decisión.** `components/ui/EmptyIllustration` con cuatro dibujos escritos a mano, rellenos con roles de color. `EmptyState` los acepta por una clave de un conjunto **cerrado**, nunca por ruta ni por `ReactNode`.

**Por qué no archivos.** Un PNG por ilustración serían cuatro peticiones más y, sobre todo, cuatro imágenes con el fondo cocido dentro: en tema claro quedarían como recortes oscuros pegados sobre blanco. En línea usan los mismos tokens que el resto de la app y siguen al tema sin que exista una segunda versión de cada dibujo. Pesan ~1,2 kB en total, menos que un solo PNG.

**Por qué el conjunto es cerrado.** Un `ReactNode` dejaría entrar cualquier imagen, y con ella los colores fijos que el punto anterior evita.

**Por qué sólo cuatro y por qué `compact` las ignora.** Se ilustran los vacíos que ocupan la pantalla entera —cuentas, movimientos, búsqueda sin resultados, historial—, que es donde el hueco se nota y donde alguien que abre la app por primera vez decide si está rota o simplemente vacía. Un dibujo de 96 px dentro de una tarjeta de resumen desplaza el contenido real y convierte "sin gastos esta semana", que es una nota al margen, en lo más llamativo de la pantalla.

En Movimientos el dibujo depende del motivo: "todavía no hay nada" y "hay cosas, pero las estás escondiendo" son dos situaciones distintas, y el dibujo lo dice antes de leer el texto.

---

## ADR-043 — La tablet ensancha la columna; no reorganiza la app

**Decisión.** A partir de 768 px, `--layout-max-width` pasa de 480 a 600 px y `--layout-gutter` de 16 a 24. Nada más, salvo dos líneas finas que delimitan la columna.

**Por qué no dos paneles.** Sería un segundo diseño que mantener y probar para el único dispositivo que el usuario no tiene: la app se instala como APK en su teléfono. Y una línea de texto por encima de unos 75 caracteres se lee peor, no mejor.

**Por qué basta con cambiar dos tokens.** La barra inferior, el FAB y los paneles de las hojas ya se anclan a `--layout-max-width`. Ese es exactamente el trabajo que hace un token, y se comprobó: a 768 px la barra mide 600 px y queda centrada al píxel sobre el contenido, sin desbordamiento horizontal.

---

## ADR-044 — Un barrido del código fuente para los iconos, porque el tipado no puede

**Contexto.** `<Icon>` pinta la clave tal cual si no está en el registro. Es deliberado: así los emojis que v1 guardó en los datos del usuario ("🍔", "🏦") siguen viéndose sin migrar nada. El precio es que una clave mal escrita no falla — se dibuja. Ya pasó: la fila de saldo de Seguimiento mostró la palabra «scale» en texto plano durante toda la Fase 16, sin error en consola ni fallo de compilación.

**Por qué el tipo no lo arregla.** `<Icon name>` es un `string` y tiene que serlo, porque el nombre puede venir de datos guardados.

**Decisión.** `src/constants/icons.test.ts` recorre `src/` y comprueba que toda clave **escrita a mano** —`icon="…"` y `<Icon name="…">`— está registrada. La afirmación es más estricta que la del tipo y sigue siendo cierta: un literal en el código nunca es un emoji heredado. Se añade además la comprobación de los catálogos semilla (bancos, categorías, subcategorías, tipos de cuenta, pestañas).

Si falla hay dos salidas legítimas: registrar el icono o corregir la errata. Silenciarlo devuelve la app al estado en que una palabra en inglés puede aparecer en medio de la pantalla.

---

## ADR-045 — La seguridad se deja cosida, no implementada, y el README dice la verdad incómoda

**Contexto.** El encargo fue explícito: *"No implementar todavía, solo dejar preparada la arquitectura"* para PIN, biometría y bloqueo automático.

**Decisión.** Una interfaz de cuatro métodos (`getStatus`, `unlock`, `lock`, `subscribe`), una implementación que no hace nada, un `<AuthGate>` transparente alrededor del enrutado y un README. Sin dependencias nuevas. Activar el bloqueo será **cambiar una línea** en `services/security/index.ts` y escribir la pantalla de desbloqueo: ninguna otra pantalla ni servicio se toca.

**Por qué colocar la pasarela ahora, si no bloquea nada.** Porque *dónde* va no es un detalle. Tiene que quedar por dentro del arranque —los datos se hidratan antes, o al desbloquear se vería la app vacía un instante— y por fuera del enrutado, para que un enlace profundo a `#/cuentas` no pueda saltárselo. Colocarla hoy, cuando se puede comprobar que no cambia nada, es más barato que colocarla el día que además haya que depurar un PIN.

**Un objeto que no hace nada, en vez de `SecurityProvider | null`.** Con `null`, cada punto de uso necesita un `if` previo, y ese `if` es exactamente donde se cuela el fallo el día que sí haya bloqueo: basta olvidarlo en un sitio para que una pantalla se lo salte. Con un objeto que siempre responde `'disabled'` no hay ninguna rama que olvidar.

**`'disabled'` no es `'unlocked'`.** Sin bloqueo configurado no hay nada que desbloquear y no debe existir pantalla intermedia; con bloqueo superado sí hay una sesión que el auto-bloqueo puede cerrar. Fundirlos obligaría al temporizador a adivinar en cuál de las dos situaciones está.

**`unlock()` es asíncrono desde el primer día**, aunque un PIN local se verifique al instante: la biometría del sistema y cualquier comprobación remota lo son, y convertirlo en `Promise` más tarde propagaría `await` por todos los llamantes.

**Y la parte que importa de verdad, escrita en el README para que nadie la descubra tarde:** los datos viven en `localStorage` **en claro**, así que un PIN aquí sería *una cortina, no una caja fuerte*. Disuade a quien coge el teléfono desbloqueado un momento; no protege frente a nadie con acceso real al dispositivo, porque los datos se leen enteros desde las herramientas de desarrollo, desde otra pestaña del mismo origen o desde un respaldo del sistema. Por eso `unlock()` devuelve un resultado y no una clave: **no hay nada que descifrar**.

De ahí una regla que no se negocia: ningún texto de la interfaz podrá prometer "tus datos están protegidos con PIN". Sería falso, y en una app de finanzas una falsa sensación de seguridad es peor que no tener ninguna. Protección real significaría cifrar el documento con una clave derivada del PIN vía `crypto.subtle` — y aceptar antes, con el usuario, que **olvidar el PIN es perder los datos**. Sin esa conversación, cifrar es una forma elaborada de borrarle el dinero a alguien.

**Verificado:** las 8 pantallas se alcanzan igual, el enlace profundo a `#/cuentas` entra directo, cero errores de consola, y la pasarela cuesta 0,17 kB gz. Los tests fijan el invariante: el proveedor activo nunca devuelve `'locked'`, que es lo único de lo que depende que `AuthGate` sea transparente.

---

## Decisiones pendientes (se resolverán en su fase)

| Tema | Fase | Nota |
|---|---|---|
| Virtualización de listas largas | 15+ | Umbral anotado (~500 ítems). No se implementa: con el filtrado en dos pasos, la lista pintada rara vez llega ahí, y virtualizar rompe Ctrl+F del navegador |
| Formato exacto del CSV de reportes | 17 | Locale es-CO: separador `;` y coma decimal, para que Excel lo abra bien |
| PIN / biometría / cifrado en reposo | ✅ 19 | Costura puesta (interfaz + no-op + `AuthGate`). **Nada implementado**, y así se queda en esta reescritura. Ver `src/services/security/README.md`: sin cifrar el documento, un PIN es una cortina, no una caja fuerte |
| Migración de `localStorage` a IndexedDB | — | Diferida. El `StorageAdapter` ya deja la puerta abierta |
