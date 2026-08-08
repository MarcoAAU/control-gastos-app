# Origen de los iconos de la app

`icono-original.png` es la imagen que entregó el usuario y de la que salen los
tres iconos de `public/icons/`. Se guarda aquí para poder regenerarlos sin
volver a pedírsela.

## ⚠️ Mide 135×134 px, y eso importa

El manifiesto necesita 512×512, así que los iconos actuales están **ampliados
casi 4×**. Se ven correctos en la pestaña del navegador y aceptables en la
lista de aplicaciones, pero en el lanzador de Android —donde se pintan grandes—
se notan blandos. **Con un original de 512 px o más, regenerarlos los dejaría
nítidos sin cambiar nada más.**

Además, la imagen es una captura: el recuadro redondeado venía sobre un fondo
gris claro (`#eaeaea`), no transparente. Por eso los iconos no se generan
recortando sin más, sino a partir del recuadro real, que empieza en (3, 2) y
mide 129×128.

## Los tres archivos y por qué son tres

| Archivo | Propósito | Qué tiene de particular |
|---|---|---|
| `icon-192.png` | `any` | Esquinas redondeadas y **transparentes**: sin el gris de la captura. Es también el favicon y el icono de iOS |
| `icon-512.png` | `any` | Igual, a mayor tamaño |
| `icon-maskable-512.png` | `maskable` | Azul **a sangre** con el logo al 68%. Android recorta los `maskable` con la forma del lanzador —círculo, gota, cuadrado— y puede comerse un 20% de cada borde; con el logo holgado, el recorte siempre cae sobre fondo liso |

Usar un único archivo para los dos propósitos era lo que había antes y con este
logo no vale: la "M" ocupa casi todo el recuadro y perdería las puntas.

## Cómo se generaron (sin dependencias nuevas)

No hay `sharp` ni ImageMagick en el proyecto, y no se añadieron. Los PNG se
produjeron con el `<canvas>` del navegador: recortar el recuadro real, escalar
con suavizado alto, aplicar la máscara redondeada (o el fondo a sangre) y
exportar.

Los colores se **cuantizan a 32 niveles por canal** antes de exportar. La
ampliación genera miles de tonos intermedios que el PNG comprime fatal: sin
cuantizar, los tres archivos pesaban 446 kB; con ella, 164 kB. En zonas planas
no produce bandas, porque el azul sigue resolviéndose a un único color.

## Al cambiar el icono, recuerda

El icono de la PWA instalada y el del APK se fijan **al instalar**. Desplegar
cambia el del navegador, pero en el teléfono no se verá hasta reinstalar la PWA
o regenerar el APK — y ese APK debe firmarse con el **keystore original**.
