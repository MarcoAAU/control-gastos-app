# Checklist de regresión — paridad v1 → v2

Inventario **completo** del comportamiento observable de la app v1 (tag `v1-vanilla`, commit `5dc7494`), extraído leyendo `index.html` (4 vistas + 8 modales) y `app.js` (939 líneas).

**Cómo se usa:** se ejecuta entero en la **Fase 9** (milestone de paridad), otra vez en la **Fase 18** (tras el rediseño de UI) y una última vez en la **Fase 20** (release). Ningún ítem puede quedar en ❌ sin una justificación escrita de por qué se reemplazó por algo mejor.

**Leyenda:** ✅ funciona igual o mejor · 🔄 reemplazado intencionalmente (con nota) · ❌ regresión (bloquea el avance)

---

## A. Navegación y shell (6)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 1 | La barra inferior alterna entre Inicio, Movimientos y Cuentas | | | |
| 2 | La pestaña activa se resalta visualmente | | | |
| 3 | El ícono ⚙️ de la barra superior abre Ajustes | | | |
| 4 | El botón 🔄 recarga la app (y limpia caché si hay conexión) | | | |
| 5 | El botón flotante `+` abre el formulario de movimiento | | | |
| 6 | La app arranca siempre en Inicio | | | |

## B. Movimientos (9)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 7 | Crear un **gasto** (monto, descripción, categoría, cuenta, fecha) | | | |
| 8 | Crear un **ingreso** mediante el toggle Gasto/Ingreso | | | |
| 9 | El selector de categoría cambia según el tipo (gasto vs ingreso) | | | |
| 10 | El campo Monto muestra **separadores de miles mientras se escribe** (`1.234.567`) | | | |
| 11 | La fecha viene precargada con el día de hoy al crear | | | |
| 12 | Editar un movimiento existente (precarga todos sus datos) | | | |
| 13 | Eliminar un movimiento, con confirmación previa | | | |
| 14 | Filtrar la lista por categoría | | | |
| 15 | Filtrar la lista por cuenta (los filtros se combinan) | | | |

## C. Cuentas (7)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 16 | Listar cuentas con su saldo | | | |
| 17 | "+ Conectar banco" muestra los 4 bancos demo + la opción "Otro" | | | |
| 18 | Elegir un banco pide el **saldo real al usuario** (no genera uno aleatorio) | | | |
| 19 | Conectar una cuenta **no** crea movimientos automáticos | | | |
| 20 | "Ajustar saldo" cambia el saldo de una cuenta | | | |
| 21 | Eliminar una cuenta, con confirmación; sus movimientos se conservan | | | |
| 22 | Un movimiento cuya cuenta fue borrada no rompe la lista (muestra "—") | | | |

## D. Inicio / Dashboard (6)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 23 | Las pestañas Hoy / Semana / Mes cambian el periodo mostrado | | | |
| 24 | Se muestran 3 cifras: Ingresos, Egresos y Saldo — ⚠️ **ver nota 1** | | | |
| 25 | Fila horizontal de cuentas con sus saldos | | | |
| 26 | Gráfica de dona de gastos por categoría, con leyenda de porcentajes | | | |
| 27 | Gráfica de barras de tendencia (14 días) | | | |
| 28 | Lista de movimientos recientes del periodo (máx. 6) | | | |

## E. Historial guardado (4)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 29 | "+ Guardar" pide nombre, fecha desde y fecha hasta | | | |
| 30 | Valida que "Desde" no sea posterior a "Hasta" | | | |
| 31 | Al abrir un historial se ven sus movimientos y sus totales congelados | | | |
| 32 | Eliminar un historial no afecta los movimientos originales | | | |

## F. Ajustes y datos (3)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 33 | "Restablecer datos de demo", con confirmación | | | |
| 34 | "Borrar todos los datos", con confirmación | | | |
| 35 | Los datos sobreviven a recargar la página (persistencia real) | | | |

## G. Plataforma / PWA (5)

| # | Comportamiento v1 | Fase 9 | Fase 18 | Fase 20 |
|---|---|---|---|---|
| 36 | Funciona offline tras la primera carga | | | |
| 37 | Es instalable como PWA (Chrome Android / Safari iOS) | | | |
| 38 | Funciona dentro del APK (TWA) sin barra de direcciones | | | |
| 39 | Las confirmaciones funcionan en PWA instalada — ⚠️ **ver nota 2** | | | |
| 40 | Las gráficas no se deforman al hacer scroll ni al cambiar de pestaña — ⚠️ **ver nota 3** | | | |

---

## Notas de reemplazo intencional

**Nota 1 — ítem 24 (cambio de significado, esperado 🔄).** En v1 la tarjeta rotulada "Ingresos" en realidad calculaba `state.accounts.reduce((s,a)=>s+a.balance,0)` (`app.js:221`), es decir el **saldo total de las cuentas**, no los ingresos. En v2 se separan correctamente: **Saldo total** (stock) e **Ingresos del periodo** (flujo, solo transacciones de tipo ingreso). Consecuencia esperada: *el número que el usuario veía bajo "Ingresos" cambiará tras actualizar*. Es una corrección, no una regresión — debe comunicarse al usuario.

**Nota 2 — ítem 39.** v1 usaba `window.confirm()`, que las PWA instaladas en iOS Safari deshabilitan silenciosamente: el usuario tocaba "Eliminar" y no pasaba nada. Se corrigió en el commit `8421858` con un modal propio. v2 debe conservar ese modal propio, nunca volver a `confirm()`.

**Nota 3 — ítem 40.** v1 tuvo un bug donde el alto del `<canvas>` se multiplicaba por el `devicePixelRatio` en cada redibujo (180 → 540 → 1620 →…), deformando las gráficas al scrollear o cambiar de pestaña; corregido en `0b771a1`. En v2 el problema desaparece por construcción al usar Recharts (SVG en vez de Canvas).

**Nota 4 — cambio cromático deliberado (transversal, no es un ítem).** El texto sobre el color primario pasa de blanco a azul muy oscuro (`#0a1338`). En v1 el par blanco/`#6c8dff` daba 3.05:1 de contraste, por debajo del mínimo AA de 4.5:1. El acento `#6c8dff` no cambia. Ver ADR-012. Afecta al botón principal, al FAB y a las pestañas activas: si al revisar la app "el texto de los botones azules se ve oscuro", es intencional.

## Invariante que NO estaba en v1 pero es criterio de aceptación en v2

| # | Comportamiento | Fase 15 | Fase 20 |
|---|---|---|---|
| 41 | **Agregar un gasto NO reduce la cifra de "Ingresos" del periodo** (la queja original del usuario, resuelta de raíz) | | |
| 42 | Una transacción de ajuste de saldo **no** aparece en los totales de ingresos ni de gastos | | |
| 43 | Tras migrar de v1 a v2, **el saldo de cada cuenta es idéntico** al que mostraba v1 | | |
