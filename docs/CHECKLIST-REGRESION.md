# Checklist de regresión — paridad v1 → v2

Inventario **completo** del comportamiento observable de la app v1 (tag `v1-vanilla`, commit `5dc7494`), extraído leyendo `index.html` (4 vistas + 8 modales) y `app.js` (939 líneas).

**Cómo se usa:** se ejecuta entero en la **Fase 9** (milestone de paridad), otra vez en la **Fase 18** (tras el rediseño de UI) y una última vez en la **Fase 20** (release). Ningún ítem puede quedar en ❌ sin una justificación escrita de por qué se reemplazó por algo mejor.

**Leyenda:** ✅ funciona igual o mejor · 🔄 reemplazado intencionalmente (con nota) · ⏳ pendiente de la Fase 10 (requiere despliegue real) · ❌ regresión (bloquea el avance)

---

## Resultado de la Fase 9 (6 de agosto de 2026)

**38 ✅ · 2 🔄 · 2 ⏳ · 0 ❌**

Verificado contra la **build de producción** (`vite preview`), no contra el servidor de desarrollo, y sobre un `localStorage` sembrado con el blob real de v1. Cero errores de consola.

Los dos ⏳ son los ítems 37 y 38 (instalable como PWA, funciona dentro del APK): no se pueden comprobar en `localhost` porque exigen HTTPS y el TWA firmado. Se verifican en la Fase 10, que es exactamente por lo que esa fase va antes que las funcionalidades nuevas.

Los dos 🔄 están explicados en las notas 1 y 5.

---

## A. Navegación y shell (6)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 1 | La barra inferior alterna entre Inicio, Movimientos y Cuentas | ✅ | | |
| 2 | La pestaña activa se resalta visualmente | ✅ | | |
| 3 | El ícono ⚙️ de la barra superior abre Ajustes | ✅ | | |
| 4 | El botón 🔄 recarga la app (y limpia caché si hay conexión) | ✅ | | |
| 5 | El botón flotante `+` abre el formulario de movimiento | ✅ | | |
| 6 | La app arranca siempre en Inicio | 🔄 | | |

## B. Movimientos (9)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 7 | Crear un **gasto** (monto, descripción, categoría, cuenta, fecha) | ✅ | | |
| 8 | Crear un **ingreso** mediante el toggle Gasto/Ingreso | ✅ | | |
| 9 | El selector de categoría cambia según el tipo (gasto vs ingreso) | ✅ | | |
| 10 | El campo Monto muestra **separadores de miles mientras se escribe** (`1.234.567`) | ✅ | | |
| 11 | La fecha viene precargada con el día de hoy al crear | ✅ | | |
| 12 | Editar un movimiento existente (precarga todos sus datos) | ✅ | | |
| 13 | Eliminar un movimiento, con confirmación previa | ✅ | | |
| 14 | Filtrar la lista por categoría | ✅ | | |
| 15 | Filtrar la lista por cuenta (los filtros se combinan) | ✅ | | |

## C. Cuentas (7)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 16 | Listar cuentas con su saldo | ✅ | | |
| 17 | "+ Conectar banco" muestra los 4 bancos demo + la opción "Otro" | ✅ | | |
| 18 | Elegir un banco pide el **saldo real al usuario** (no genera uno aleatorio) | ✅ | | |
| 19 | Conectar una cuenta **no** crea movimientos automáticos | ✅ | | |
| 20 | "Ajustar saldo" cambia el saldo de una cuenta | ✅ | | |
| 21 | Eliminar una cuenta, con confirmación; sus movimientos se conservan | ✅ | | |
| 22 | Un movimiento cuya cuenta fue borrada no rompe la lista (muestra "—") | ✅ | | |

## D. Inicio / Dashboard (6)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 23 | Las pestañas Hoy / Semana / Mes cambian el periodo mostrado | ✅ | | |
| 24 | Se muestran 3 cifras: Ingresos, Egresos y Saldo — ⚠️ **ver nota 1** | 🔄 | | |
| 25 | Fila horizontal de cuentas con sus saldos | ✅ | | |
| 26 | Gráfica de dona de gastos por categoría, con leyenda de porcentajes | ✅ | | |
| 27 | Gráfica de barras de tendencia (14 días) | ✅ | | |
| 28 | Lista de movimientos recientes del periodo (máx. 6) | ✅ | | |

## E. Historial guardado (4)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 29 | "+ Guardar" pide nombre, fecha desde y fecha hasta | ✅ | | |
| 30 | Valida que "Desde" no sea posterior a "Hasta" | ✅ | | |
| 31 | Al abrir un historial se ven sus movimientos y sus totales congelados | ✅ | | |
| 32 | Eliminar un historial no afecta los movimientos originales | ✅ | | |

## F. Ajustes y datos (3)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 33 | "Restablecer datos de demo", con confirmación | ✅ | | |
| 34 | "Borrar todos los datos", con confirmación | ✅ | | |
| 35 | Los datos sobreviven a recargar la página (persistencia real) | ✅ | | |

## G. Plataforma / PWA (5)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 36 | Funciona offline tras la primera carga | ✅ | | |
| 37 | Es instalable como PWA (Chrome Android / Safari iOS) | ⏳ | | |
| 38 | Funciona dentro del APK (TWA) sin barra de direcciones | ⏳ | | |
| 39 | Las confirmaciones funcionan en PWA instalada — ⚠️ **ver nota 2** | ✅ | | |
| 40 | Las gráficas no se deforman al hacer scroll ni al cambiar de pestaña — ⚠️ **ver nota 3** | ✅ | | |

---

## Notas de reemplazo intencional

**Nota 1 — ítem 24 (cambio de significado, esperado 🔄).** En v1 la tarjeta rotulada "Ingresos" en realidad calculaba `state.accounts.reduce((s,a)=>s+a.balance,0)` (`app.js:221`), es decir el **saldo total de las cuentas**, no los ingresos. En v2 se separan correctamente: **Saldo total** (stock) e **Ingresos del periodo** (flujo, solo transacciones de tipo ingreso). Consecuencia esperada: *el número que el usuario veía bajo "Ingresos" cambiará tras actualizar*. Es una corrección, no una regresión — debe comunicarse al usuario.

**Nota 2 — ítem 39.** v1 usaba `window.confirm()`, que las PWA instaladas en iOS Safari deshabilitan silenciosamente: el usuario tocaba "Eliminar" y no pasaba nada. Se corrigió en el commit `8421858` con un modal propio. v2 debe conservar ese modal propio, nunca volver a `confirm()`.

**Nota 3 — ítem 40.** v1 tuvo un bug donde el alto del `<canvas>` se multiplicaba por el `devicePixelRatio` en cada redibujo (180 → 540 → 1620 →…), deformando las gráficas al scrollear o cambiar de pestaña; corregido en `0b771a1`. En v2 el problema desaparece por construcción al usar Recharts (SVG en vez de Canvas).

**Nota 5 — ítem 6 (cambio de comportamiento, esperado 🔄).** En v1 recargar la página volvía SIEMPRE al Inicio, porque la vista activa era una variable en memoria. En v2 recargar **conserva la pantalla en la que estabas**, porque la ruta vive en la URL (`#/cuentas`). Es una de las tres razones por las que se introdujo el router (ADR-007), junto con que el botón Atrás de Android ya no cierra la app. Sigue arrancando en Inicio la primera vez que se abre.

**Nota 6 — ítem 33 (reforzado, no reemplazado).** "Restablecer datos de demo" existe, pero con dos cambios frente a v1: (a) los importes son **fijos**, no `Math.random()`, para que los totales de ejemplo sean verificables y no cambien entre dos personas mirando "lo mismo"; (b) **nunca se cargan solos**. v1 hacía `loadState() || makeDemoState()`, así que arrancar sin datos inventaba cuentas y saldos que el usuario no había escrito — el origen de la queja de que la app "se inventaba" cifras. En v2 la app vacía se queda vacía, y la demo sólo entra si el usuario pulsa y confirma. El documento resultante queda marcado con `meta.migratedFrom: 'demo'`.

**Nota 4 — cambio cromático deliberado (transversal, no es un ítem).** El texto sobre el color primario pasa de blanco a azul muy oscuro (`#0a1338`). En v1 el par blanco/`#6c8dff` daba 3.05:1 de contraste, por debajo del mínimo AA de 4.5:1. El acento `#6c8dff` no cambia. Ver ADR-012. Afecta al botón principal, al FAB y a las pestañas activas: si al revisar la app "el texto de los botones azules se ve oscuro", es intencional.

## Invariante que NO estaba en v1 pero es criterio de aceptación en v2

| # | Comportamiento | Fase 15 | Fase 20 |
|---|---|---|---|
| 41 | **Agregar un gasto NO reduce la cifra de "Ingresos" del periodo** (la queja original del usuario, resuelta de raíz) | | |
| 42 | Una transacción de ajuste de saldo **no** aparece en los totales de ingresos ni de gastos | | |
| 43 | Tras migrar de v1 a v2, **el saldo de cada cuenta es idéntico** al que mostraba v1 | | |

## Accesibilidad y apariencia (Fase 18)

Medido sobre el build de producción, en las 8 pantallas y en los 2 temas.

| # | Comportamiento | Fase 18 | Fase 20 |
|---|---|---|---|
| 44 | Ningún par texto/fondo por debajo de AA (4.5:1, o 3:1 en texto grande) | ✅ | |
| 45 | Ningún control sin nombre accesible, ningún campo sin etiqueta | ✅ | |
| 46 | Sin `id` duplicados ni `aria-labelledby` roto ni `tabindex` positivo | ✅ | |
| 47 | Los encabezados no saltan niveles (`h1` → `h2`, nunca `h1` → `h3`) | ✅ | |
| 48 | El foco no sale de una hoja abierta ni con Tab ni con Mayús+Tab | ✅ | |
| 49 | Escape cierra la hoja, devuelve el foco y restaura el scroll del fondo | ✅ | |
| 50 | El anillo de foco se ve en todo control alcanzable con teclado | ✅ | |
| 51 | Las flechas recorren las pestañas de periodo; el grupo es UNA parada de Tab | ✅ | |
| 52 | El tema claro se elige en Ajustes y se conserva al recargar | ✅ | |
| 53 | «Sistema» sigue al modo del teléfono y lo dice en pantalla | ✅ | |
| 54 | **No hay parpadeo oscuro al arrancar con el tema claro** | ✅ | |
| 55 | La barra de estado del sistema toma el color del tema activo | ✅ | |
| 56 | A 768 px la columna se ensancha a 600 px sin desbordamiento horizontal | ✅ | |
| 57 | Los estados vacíos de pantalla completa muestran ilustración, no un icono | ✅ | |
| 58 | Cambiar de pestaña salta al principio de la pantalla; Atrás no | ✅ | |
| 59 | El FAB no se descoloca durante la transición de pantalla | ✅ | |
| 60 | `prefers-reduced-motion` anula animaciones y transiciones | ✅ | |

**Nota 7 — lo que NO se pudo verificar en el navegador integrado.** Tres comprobaciones quedan pendientes de un dispositivo real, y conviene saber por qué:

- **Activación con Enter/Espacio.** El automatismo entrega el evento de teclado pero el navegador no ejecuta la acción por defecto: un `<button>` nativo insertado a mano en la página tampoco recibe `click`. Se comprobó en su lugar que no existe ningún `<div onClick>` en la app — todo control es un `<button>` o un `<a>` reales, que es lo que garantiza esa activación.
- **El evento `change` de `prefers-color-scheme`.** El emulador cambia `matches` sin emitirlo (verificado con un `addEventListener` propio). La resolución sí se comprobó, recargando en cada esquema: «Sistema» da oscuro con el sistema en oscuro y claro con el sistema en claro.
- **Animaciones y transiciones en marcha.** La pestaña no compone fotogramas (`document.timeline.currentTime` no avanza y `requestAnimationFrame` no se dispara), así que toda propiedad con `transition` se queda congelada en su valor inicial. Es la causa del único "fallo" de contraste que aparecía en la barra inferior: medido desde los tokens, da 6,24:1 inactivo y 5,68:1 activo.
- **Lighthouse.** No se ejecutó: requiere un Chrome controlable desde fuera. Las comprobaciones 44-47 son las mismas que audita su apartado de accesibilidad, hechas a mano sobre las 8 pantallas y los 2 temas.

## Costura de seguridad (Fase 19) — la pasarela no debe notarse

| # | Comportamiento | Fase 19 | Fase 20 |
|---|---|---|---|
| 61 | La app arranca directa: `AuthGate` no muestra ninguna pantalla intermedia | ✅ | |
| 62 | Un enlace profundo (`#/cuentas`) entra sin pasar por nada | ✅ | |
| 63 | Las 8 pantallas se alcanzan igual que antes, sin errores de consola | ✅ | |
| 64 | El proveedor activo nunca devuelve `'locked'` (fijado por tests) | ✅ | |

**Nota 8 — lo que la Fase 19 NO hace, y hay que decirlo al usuario.** No existe PIN, ni biometría, ni bloqueo por inactividad, ni cifrado. Sólo hay una interfaz, una implementación vacía y el sitio donde enchufarla. Y cuando se implemente, el texto de la interfaz **no podrá prometer que los datos están protegidos**: viven en `localStorage` en claro, así que un PIN disuade a quien coge el teléfono un momento pero no protege frente a nadie con acceso real al dispositivo. La única protección real contra la pérdida de datos sigue siendo el respaldo exportable de Ajustes.

## Verificación final v2.1 (Fase 20)

Ejecutado sobre el **build de producción**, con el blob v1 sembrado en un perfil de navegador limpio.

| # | Comprobación | Resultado |
|---|---|---|
| 65 | Blob v1 "sano": los 3 saldos idénticos tras migrar (incl. tarjeta en −$420.000) | ✅ |
| 66 | Blob de casos borde: los 4 saldos idénticos (incl. tarjeta en −$1.250.000) | ✅ |
| 67 | 4 importes inválidos descartados, cada uno con su aviso nominal | ✅ |
| 68 | Movimiento huérfano conservado y movido a "Sin asignar" | ✅ |
| 69 | Categoría desconocida → `sys_sin_categoria`, no a la "Otros" del usuario | ✅ |
| 70 | Movimiento sin `type` migrado como gasto | ✅ |
| 71 | Nombre de banco escrito a mano ("Scotiabank Colpatria") conservado | ✅ |
| 72 | `gastos_app_data_v1` intacto y respaldo previo creado | ✅ |
| 73 | Aviso post-migración: sale en el primer arranque, no en el segundo | ✅ |
| 74 | Self-XSS de la auditoría §16: el payload se pinta como texto | ✅ |
| 75 | Ajuste de saldo mueve el saldo y NO toca Ingresos ni Gastos | ✅ |
| 76 | Alta → recarga → edición → borrado, con la ruta conservada | ✅ |
| 77 | Separador de miles en vivo (`123456` → `123.456`) | ✅ |
| 78 | Offline con el servidor apagado: carga y navega entera | ✅ |
| 79 | Respaldo exportado con `appVersion: 2.1.0` y marca registrada | ✅ |
| 80 | Presupuesto de bundle: 95,40 kB gz de 100; Recharts fuera de la carga inicial | ✅ |

### Pendiente, y sólo lo puede hacer el usuario

| # | Comprobación | Por qué no se puede desde aquí |
|---|---|---|
| 37 | Instalable como PWA | Requiere HTTPS |
| 38 | APK (TWA) sin barra de direcciones | Requiere el TWA firmado y `assetlinks.json` |
| 81 | **Migración con el blob v1 REAL** | Los fixtures son sintéticos; nunca se capturó un dump del dispositivo, y no debe capturarse sin anonimizar. Los saldos reales sólo se confirman en el teléfono |
| 82 | **APK regenerado con el keystore ORIGINAL** | ⚠️ Con un keystore nuevo la actualización falla y obliga a desinstalar, lo que borra el `localStorage` del WebView: los datos financieros |
| 83 | Lighthouse en producción | Necesita un Chrome controlable desde fuera. Sustituido por la auditoría manual de los ítems 44-47 |

## Correcciones y mejoras posteriores a v2.1

Verificado sobre el build de producción, a 375 px salvo donde se indica.

| # | Comprobación | Resultado |
|---|---|---|
| 84 | "Borrar todos los datos" conserva las 15 categorías y los 5 bancos | ✅ |
| 85 | …y borra lo que debe: cuentas, movimientos e historial | ✅ |
| 86 | Un documento ya dañado se repara solo al abrir la app, **y se guarda** | ✅ |
| 87 | El segundo arranque no repara ni avisa otra vez | ✅ |
| 88 | Diez pasadas seguidas no duplican ninguna categoría | ✅ |
| 89 | Las categorías editadas por el usuario conservan nombre y color | ✅ |
| 90 | Las categorías archivadas no resucitan | ✅ |
| 91 | Tras borrar todo se puede volver a crear una cuenta | ✅ |
| 92 | Nombre y detalle del movimiento quedan APILADOS, no en la misma línea | ✅ |
| 93 | Nombres de 281-319 px en 176-196 px se recortan con puntos suspensivos | ✅ |
| 94 | Ni el nombre ni el detalle invaden el importe | ✅ |
| 95 | Todas las filas miden lo mismo y no hay desbordamiento horizontal | ✅ |
| 96 | Refresh y Ajustes en las 7 pestañas, misma posición y tamaño (40×40) | ✅ |
| 97 | Refresh no duplica, no borra y deja al usuario en la misma pantalla | ✅ |
| 98 | **Refresh pulsado antes del rebote de 300 ms no pierde el movimiento** | ✅ |
| 99 | Indicadores: plegar/desplegar, `aria-expanded`, `inert` al plegarse | ✅ |
| 100 | Plegado mide 0 px: sin huecos residuales | ✅ |
| 101 | La preferencia sobrevive a cerrar y reabrir la app | ✅ |
| 102 | Swipe izquierda/derecha recorre las pestañas en orden | ✅ |
| 103 | No navega: gesto corto, vertical, lento o diagonal dudosa | ✅ |
| 104 | No navega desde una fila, el buscador o el FAB | ✅ |
| 105 | No navega con una hoja abierta; funciona otra vez al cerrarla | ✅ |
| 106 | No da la vuelta en los extremos ni actúa fuera de las pestañas | ✅ |
| 107 | La barra inferior y el botón Atrás siguen funcionando | ✅ |
| 108 | El scroll vertical no se ve afectado | ✅ |
| 109 | La entrada se anima según la dirección del gesto | ✅ |
| 110 | Crear / duplicar / editar / borrar movimiento (12→13→14→13) | ✅ |
| 111 | Saldo, ingresos, gastos, indicadores y gráficas siguen bien | ✅ |
| 112 | Las 7 pantallas cargan sin errores de consola | ✅ |
| 113 | A 768 px: sin desbordamiento y sin superposiciones | ✅ |

**Nota 9 — cambio de comportamiento en el botón Refresh (esperado 🔄).** Antes borraba todas las cachés y recargaba la página: eso forzaba una versión nueva de la app, no refrescaba datos. Ahora relee los datos del dispositivo sin sacar al usuario de la pantalla. La actualización a una versión nueva la sigue haciendo sola el Service Worker al reabrir la app.
