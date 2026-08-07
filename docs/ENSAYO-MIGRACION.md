# Ensayo en seco de la migración (v1 → v2)

Este procedimiento comprueba, **sobre tus datos reales y sin modificar nada**, que la migración conservará tus saldos exactamente como están hoy.

Los tests automáticos cubren los casos que pudimos imaginar (88 tests, incluidos saldos negativos, cuentas sin movimientos, importes corruptos y cuentas borradas). Este ensayo cubre el caso que de verdad importa: **el tuyo**.

> **Garantía:** el ensayo sólo LEE. No escribe, no borra y no modifica nada. Puedes ejecutarlo tantas veces como quieras.

---

## Cuándo hacerlo

Antes de la Fase 10, que es cuando la versión 2 se publica y sustituye a la actual en `https://marcoaau.github.io/control-gastos-app/`.

## Cómo hacerlo

1. Abre **Chrome en el computador** (no el móvil: hace falta la consola).
2. Entra a `https://marcoaau.github.io/control-gastos-app/`
   ⚠️ Tiene que ser esa dirección exacta. Los datos del navegador están atados al origen: desde `localhost` o desde otra URL no se ven.
3. Pulsa `F12` para abrir las herramientas de desarrollo y ve a la pestaña **Console**.
4. Pega esto y pulsa Enter:

```js
copy(localStorage.getItem('gastos_app_data_v1'))
```

Eso copia tu blob de datos al portapapeles. Pégalo en un archivo de texto y guárdalo: **ése es tu respaldo manual**, independiente de todo lo demás.

5. Cuando la versión 2 esté desplegada, en esa misma consola:

```js
await __migrationDryRun()
```

## Cómo leer el resultado

Aparece una tabla con una fila por cuenta:

| cuenta | saldo v1 | saldo v2 (derivado) | saldo inicial calculado | coincide |
|---|---|---|---|---|
| Cuenta principal | 3.250.000 | 3.250.000 | 850.000 | ✅ |

- **coincide ✅ en todas las filas** → la migración es segura.
- **algún ❌** → **no continúes**. Copia la tabla y repórtala; hay un caso que los fixtures no cubren.

Debajo de la tabla salen los avisos, si los hay. Son normales y esperados; describen decisiones tomadas, no fallos:

- *"se descartó X porque su importe no era válido"* → ese movimiento tenía importe `0`, negativo o vacío en v1. Es irrecuperable: se te dice cuál para que lo vuelvas a escribir a mano.
- *"apuntaba a una cuenta inexistente; se movió a Sin asignar"* → el movimiento se conserva, en una cuenta especial que no suma al saldo total, para que puedas reasignarlo.
- *"tenía una categoría desconocida"* → el movimiento se conserva, marcado como "Sin categoría".

## Qué pasa después, en la migración de verdad

Cuando abras la versión 2 por primera vez, en este orden:

1. Se copia tu blob v1 **crudo** a `gastos_app_backup_<fecha>`.
2. Se migra en memoria.
3. Se escribe el documento nuevo en `gastos_app_data_v2`.
4. **`gastos_app_data_v1` se queda donde está, para siempre.** No se borra nunca.

Si el paso 1 falla, no se ejecutan los pasos 2-4: la app funciona esa sesión en memoria y te avisa. Nunca se deja el almacenamiento a medias.

## El único cambio de cifra que verás

El número rotulado **"Ingresos"** en la pantalla de inicio va a cambiar, y es **intencional**.

En la versión 1 esa tarjeta decía "Ingresos" pero calculaba en realidad la **suma de los saldos de tus cuentas** (`app.js:221`). Por eso cada gasto la hacía bajar, que fue justo lo que reportaste. En la versión 2 son dos cifras separadas y correctas:

- **Saldo total** → la suma de los saldos de tus cuentas (el número que veías antes bajo "Ingresos").
- **Ingresos del periodo** → el dinero que entró en ese periodo. Un gasto ya no lo toca.

Tus saldos por cuenta no cambian. Ver ADR-003 en `DECISIONES-TECNICAS.md`.
