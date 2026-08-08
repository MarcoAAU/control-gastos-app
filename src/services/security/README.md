# Costura de seguridad

**Estado: nada implementado.** Esta carpeta contiene una interfaz, una implementación que no hace nada y este documento. Es lo que se pidió: dejar la arquitectura preparada sin activar ningún bloqueo todavía.

## Qué hay

| Archivo | Qué es |
|---|---|
| `SecurityProvider.ts` | La interfaz. Cuatro métodos: `getStatus`, `unlock`, `lock`, `subscribe` |
| `NoopSecurityProvider.ts` | Implementación que siempre responde `'disabled'` |
| `index.ts` | **La costura.** Una línea decide qué proveedor usa la app |
| `../../components/security/AuthGate.tsx` | Envuelve el enrutado en `App.tsx`. Hoy deja pasar siempre |

Además, `AppSettings.security` ya reserva `pinEnabled`, `biometricsEnabled` y `autoLockMinutes`. Existen desde la Fase 3 y nadie los lee: están ahí para que activar el bloqueo sea **añadir código**, no migrar el modelo de datos con el dinero real del usuario dentro.

## ⚠️ Lo que un PIN protege aquí, y lo que no

Esta es la parte que hay que leer antes de implementar nada, y la que hay que contarle al usuario sin adornos.

Los datos viven en `localStorage`, **en claro**. Un PIN en la interfaz es una **cortina, no una caja fuerte**:

- **Sí** disuade a quien coge el teléfono desbloqueado un momento y abre la app.
- **No** protege frente a nadie con acceso real al dispositivo. Los datos se leen enteros desde las herramientas de desarrollo del navegador, desde otra pestaña del mismo origen o desde un respaldo del sistema. El PIN no cifra nada: sólo decide si se pinta una pantalla.
- **No** protege frente a malware ni frente a alguien que sepa dónde mira.

Por eso `unlock()` devuelve un `UnlockResult` y no una clave: **no hay nada que descifrar**. Si algún día se quiere protección de verdad, el trabajo no es la pantalla de PIN, es cifrar el contenido antes de guardarlo (ver más abajo).

**Regla que no se negocia:** cualquier texto que se enseñe al usuario debe decir esto con claridad. Prometer "tus datos están protegidos con PIN" sería falso, y en una app de finanzas una falsa sensación de seguridad es peor que no tener ninguna.

## Cómo se activa

1. Escribir un proveedor que implemente `SecurityProvider`.
2. Cambiar **una línea** en `index.ts`:
   ```ts
   export const security: SecurityProvider = miProveedorDeVerdad;
   ```
3. Escribir la pantalla de desbloqueo y sustituir `LockedPlaceholder` en `AuthGate`.
4. Añadir los controles en Ajustes, que escriben en `settings.security`.

Ninguna pantalla ni ningún servicio más se toca. Ése es el objetivo de la costura.

## Decisiones ya tomadas (y por qué)

**`'disabled'` no es `'unlocked'`.** Sin bloqueo configurado no hay nada que desbloquear y no debe existir pantalla intermedia. Con bloqueo configurado y superado, hay una sesión que el auto-bloqueo puede cerrar. Fundirlos obligaría al temporizador a adivinar en cuál de las dos está.

**`unlock()` es asíncrono desde el primer día**, aunque un PIN local se verifique al instante. La biometría del sistema y cualquier comprobación remota lo son; convertirlo en `Promise` más tarde propagaría `await` por todos los llamantes.

**El proveedor no-op es un objeto, no una fábrica.** No tiene estado, y `useSyncExternalStore` exige que `subscribe` y `getStatus` sean referencias estables. Un proveedor con estado sí será una fábrica, pero se instancia **una vez** en `index.ts`, nunca dentro de un componente.

**`AuthGate` va por dentro del arranque y por fuera del enrutado.** Por dentro porque los datos se hidratan antes: si no, tras desbloquear se vería la app vacía un instante. Por fuera porque un enlace profundo a `#/cuentas` no puede saltarse el bloqueo.

**Un objeto que no hace nada, en vez de `SecurityProvider | null`.** Con `null`, cada punto de uso necesita un `if` previo, y ese `if` es exactamente donde se cuela el fallo el día que sí haya bloqueo: basta olvidarlo en un sitio para que una pantalla se lo salte.

## Si algún día se quiere protección real

El orden correcto, y ninguno de estos pasos es esta fase:

1. Cifrar el documento antes de guardarlo, con una clave derivada del PIN (`PBKDF2`/`Argon2` vía `crypto.subtle`, que ya viene en el navegador — sin dependencias nuevas).
2. Asumir las consecuencias y decidirlas antes de escribir código: **si el usuario olvida el PIN, los datos se pierden**. Sin esa conversación, cifrar es una forma elaborada de borrarle el dinero a alguien.
3. Sólo entonces, la pantalla de bloqueo y el auto-bloqueo por inactividad.

El respaldo exportable de Ajustes sigue siendo, hoy y después, la única protección real contra la pérdida de datos.
