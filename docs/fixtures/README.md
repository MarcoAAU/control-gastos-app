# Fixtures de migración

Estos archivos son **datos de prueba** para los tests de `storage/migrations/legacyToV2`. Reproducen la forma real del blob que la app v1 guarda bajo la clave `gastos_app_data_v1` en `localStorage`.

| Archivo | Qué representa |
|---|---|
| `legacy-sample.json` | Blob v1 "sano" y representativo: 3 cuentas (incluida una de saldo negativo tipo tarjeta de crédito), movimientos de gasto e ingreso, y un historial guardado. Es el caso feliz. |
| `legacy-edge-cases.json` | Blob v1 con **todos los casos borde** que la migración debe sobrevivir sin perder datos del usuario (ver tabla abajo). |

## Casos borde cubiertos en `legacy-edge-cases.json`

| Caso | Por qué importa | Comportamiento esperado de la migración |
|---|---|---|
| Transacción sin campo `type` | Los movimientos creados antes del commit `076300b` no tenían tipo | Se asume `'expense'` (replica `app.js:159`) |
| Transacción con `accountId` inexistente | v1 no tenía integridad referencial: borrar una cuenta dejaba sus movimientos huérfanos | Se conserva el movimiento, reasignado a una cuenta "Sin asignar" creada al vuelo. **Nunca se pierde un movimiento del usuario** |
| Transacción con `categoryId` desconocida | Categoría escrita a mano o de una versión anterior | Se reasigna a `sys_sin_categoria`, **no** a la categoría "Otros" del usuario: volcar huérfanos en una categoría real ensuciaría sus reportes sin dejar rastro (ver `constants/systemIds.ts`) |
| Transacción con `amount` inválido (`0`, negativo, `null`, texto) | Datos corruptos por un bug o edición manual | Se descarta ESE registro y se anota en `migrationWarnings`. **No aborta el lote completo** |
| Cuenta con `bankId: "manual"` | Cuentas creadas con la opción "Otro" | Si `bankName` trae un nombre real ("Scotiabank Colpatria"), se crea ese banco y se conserva; si es el literal "Manual", cae en "Sin banco". El nombre que el usuario escribió no se pierde |
| Cuenta sin ningún movimiento | Cuenta recién creada | `initialBalance = balance` (no hay movimientos que descontar) |
| Cuenta con saldo negativo | Tarjetas de crédito | Se preserva el signo |
| Historial sin campos `income`/`expense`/`balance` | Snapshots guardados antes del commit `66c59af` | Se marca `origin: 'legacy'` y se usa el fallback documentado |
| Historial con `income` = saldo total mal rotulado | El bug de `app.js:221` | Se preserva el número tal cual en `totals.totalAccountsBalance` y la UI muestra una nota. **No se reescribe el histórico** |
| Blob vacío / sin cuentas / sin transacciones | Instalación nueva | Estado v2 vacío y válido |

## Invariante crítico que estos fixtures verifican

> Para **cada** cuenta del blob v1, tras migrar debe cumplirse
> `computeAccountBalance(cuentaMigrada, transaccionesMigradas) === cuentaV1.balance` (±1 por redondeo).

Es decir: **el saldo que el usuario ve en pantalla no puede cambiar al actualizar de v1 a v2.** Esta es la verificación más importante de toda la reescritura — un cambio silencioso de saldo en una app financiera es inaceptable.

## Nota sobre datos reales

Estos fixtures son **sintéticos**, no contienen información financiera real de nadie. Si en algún momento se captura un dump real del dispositivo del usuario para depurar, debe anonimizarse (multiplicar montos por un factor y reemplazar descripciones) conservando la estructura y los casos borde, y no debe commitearse sin esa anonimización.
