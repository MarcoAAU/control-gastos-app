# Despliegue — publicar v2 y regenerar el APK

Esta guía la ejecutas **tú**, en tu terminal y en tu navegador. No hay ningún
paso automático que toque tu cuenta de GitHub ni tus claves de firma.

**Orden obligatorio.** Los pasos 1 y 2 son la red de seguridad; los demás son
reversibles, esos dos no.

---

## Lo que hay ahora mismo

Verificado el 6 de agosto de 2026:

| | Estado |
|---|---|
| `https://marcoaau.github.io/control-gastos-app/` | Sirve **v1** (`app.js`, `style.css`) |
| Rama con v2 | `feat/v2-react`, sin fusionar |
| Rama publicada | `main` |
| Keystore original | ✅ **Encontrado** (ver paso 5) |
| `/.well-known/assetlinks.json` | ❌ 404 (ver paso 6) |

---

## Paso 1 — Respalda tus datos reales ANTES de nada

La primera vez que abras v2, tus datos de v1 se migran automáticamente. La
migración está diseñada para no perder nada:

- respalda el blob original en `gastos_app_backup_<timestamp>` antes de tocarlo,
- **nunca borra** `gastos_app_data_v1`,
- si el respaldo falla, no escribe nada y aborta.

Aun así, haz una copia manual. Es un minuto y te deja dormir tranquilo.

En el **mismo navegador y teléfono donde usas la app**, abre
`https://marcoaau.github.io/control-gastos-app/`, entra en las herramientas de
desarrollo (o usa el procedimiento de `ENSAYO-MIGRACION.md`) y ejecuta:

```js
copy(localStorage.getItem('gastos_app_data_v1'))
```

Pega el resultado en un archivo de texto y guárdalo fuera del teléfono (correo,
Drive, lo que sea). Ese texto **es** tu contabilidad completa.

> Si prefieres verlo antes de confiar: `ENSAYO-MIGRACION.md` explica cómo correr
> la migración **en seco** sobre tus datos reales, sin escribir nada, y ver el
> antes y el después.

---

## Paso 2 — Guarda el keystore en un sitio seguro

**Este es el riesgo crítico de esta fase.** Un APK sólo puede actualizarse si el
nuevo está firmado con **la misma clave** que el instalado. Si se firma con otra,
Android rechaza la actualización con "App not installed" y la única salida es
desinstalar — lo que **borra los datos del WebView**, es decir, tus movimientos.

La buena noticia: el keystore original existe.

```
C:\Users\Admin\Downloads\Mis Gastos - Google Play package\
├── signing.keystore          ← la clave
├── signing-key-info.txt      ← contraseñas y alias
├── Mis Gastos.apk
├── Mis Gastos.aab
└── assetlinks.json
```

Datos de esa firma (las contraseñas están en `signing-key-info.txt`, no aquí):

| Campo | Valor |
|---|---|
| Alias | `my-key-alias` |
| Paquete Android | `io.github.marcoaau.twa` |
| Huella SHA-256 | `47:E7:63:66:7E:3F:B4:D9:65:61:E2:2A:8A:4F:50:FE:38:84:67:05:6A:20:C5:21:D7:98:3F:D3:D2:5D:35:A4` |

**Copia esa carpeta entera a un sitio que no sea `Downloads`.** Es la carpeta que
más gente vacía sin mirar, y si desaparece no hay forma de recuperar la clave:
tu app quedaría sin ruta de actualización para siempre.

---

## Paso 3 — Configura GitHub Pages para que publique desde Actions

Una sola vez, en el navegador:

1. Ve a `https://github.com/MarcoAAU/control-gastos-app/settings/pages`
2. En **Build and deployment → Source**, elige **GitHub Actions**
   (antes estaba en "Deploy from a branch").
3. No cambies nada más. **La URL pública no cambia.**

> Si no haces esto, el workflow se ejecutará, pasará en verde… y Pages seguirá
> sirviendo la rama vieja. Es el fallo más confuso de todo el proceso porque
> nada aparece en rojo.

---

## Paso 4 — Fusiona y publica

```bash
git checkout main
```

```bash
git merge feat/v2-react
```

```bash
git push origin main
```

Al empujar, el workflow `Desplegar en GitHub Pages` arranca solo. Antes de
publicar nada ejecuta la compuerta completa —lint, tipos, 226 tests, build,
presupuesto de bundle y `verify-deploy`— y **si algo falla, no despliega**.

Míralo en `https://github.com/MarcoAAU/control-gastos-app/actions`.

### Qué comprobar cuando esté en verde

Abre `https://marcoaau.github.io/control-gastos-app/` **en el teléfono donde
tienes tus datos**:

1. **La primera carga puede seguir mostrando v1.** Es esperado: el Service
   Worker antiguo sirve su copia en caché y sólo después descarga la nueva.
   Cierra y vuelve a abrir, o usa el botón 🔄 de la barra superior.
2. **Compara tus saldos cuenta por cuenta** con lo que anotaste en el paso 1.
   Deben coincidir **exactamente**. Es la comprobación más importante de todo
   el proyecto.
3. **La cifra de "Ingresos" habrá cambiado, y es correcto.** En v1 esa tarjeta
   mostraba en realidad la suma de saldos de tus cuentas. Ahora hay dos números
   separados: **Saldo total** arriba (ese es el que debe coincidir con v1) e
   **Ingresos del periodo** abajo, que ahora sí son ingresos.
4. Entra en **Ajustes → Descargar respaldo** y guarda el JSON. Ya en v2, es tu
   copia de seguridad en el formato nuevo.

### Si algo sale mal

Tus datos de v1 siguen intactos en `gastos_app_data_v1`: la migración nunca los
borra. Para volver atrás, revierte el merge y vuelve a empujar:

```bash
git revert -m 1 HEAD && git push origin main
```

---

## Paso 5 — Regenera el APK con el keystore original

1. Entra en `https://www.pwabuilder.com/`
2. Pega `https://marcoaau.github.io/control-gastos-app/`
3. Elige **Android → Generate Package**
4. En las opciones de firma, **NO dejes "Create new signing key"**.
   Elige **"Use existing signing key"** y sube:
   - el archivo `signing.keystore`,
   - el alias `my-key-alias`,
   - las contraseñas de `signing-key-info.txt`.
5. Comprueba que el **Package ID** sea exactamente `io.github.marcoaau.twa`.
   Si PWABuilder propone otro, corrígelo: un package distinto se instala como
   una app **separada** en vez de actualizar la existente.

### Antes de instalar: verifica la firma

Merece la pena confirmarlo antes de tocar el teléfono. Si tienes el SDK de
Android a mano:

```bash
apksigner verify --print-certs "Mis Gastos.apk"
```

La huella SHA-256 debe ser la del paso 2. Si no coincide, **no lo instales**:
se firmó con otra clave y al intentar actualizar te obligará a desinstalar.

Instálalo **encima** del existente, sin desinstalar. Al abrirlo, tus datos deben
seguir ahí.

---

## Paso 6 — (Opcional) Quitar la barra de direcciones del APK

**Hallazgo:** `https://marcoaau.github.io/.well-known/assetlinks.json` devuelve
**404** ahora mismo.

Ese archivo es lo que le demuestra a Android que el APK y la web son del mismo
dueño. Sin él, la app instalada se abre como una pestaña de Chrome con la barra
de direcciones visible, en lugar de a pantalla completa como una app nativa.

El problema es *dónde* tiene que vivir: Android lo busca en la **raíz del
dominio**, no dentro del proyecto. Y la raíz `marcoaau.github.io` la sirve un
repositorio distinto, no éste.

Para arreglarlo:

1. Crea un repositorio llamado exactamente **`MarcoAAU.github.io`**.
2. Dentro, crea el archivo `.well-known/assetlinks.json` con el contenido de
   `assetlinks.json` que ya tienes en la carpeta del keystore.
3. Publícalo con Pages.

No es urgente y no afecta a tus datos: si no lo haces, la app funciona igual,
sólo que con la barra del navegador arriba. Por eso los ítems 37 y 38 del
checklist de regresión están en ⏳ y no en ❌.

---

## Lo que este despliegue NO cambia

- **La URL.** Sigue siendo `/control-gastos-app/`. Está fijada en
  `vite.config.ts` y `verify-deploy.mjs` falla el build si alguien la cambia:
  tu `localStorage` vive en ese origen y el APK apunta ahí.
- **El nombre del Service Worker.** Sigue siendo `sw.js`, la misma ruta que v1,
  para que el nuevo reemplace al viejo en su sitio en vez de convivir con él.
- **`gastos_app_data_v1`.** No se borra nunca, ni siquiera después de migrar.
