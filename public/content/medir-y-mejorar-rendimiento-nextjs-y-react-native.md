---
title: "Cómo medir y mejorar el rendimiento en web (Next.js) y en móvil (React Native)"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Frontend de consumidor
tags: [rendimiento, nextjs, react-native, expo, lighthouse]
excerpt: "Un mini informe de una pantalla: una métrica de base, una hipótesis, un cambio (RSC, imagen o lista virtualizada) y la métrica nueva, en Next.js 16 y en Expo 58, sin inventar números."
status: published
---

Hoy vamos a ver cómo medir y mejorar el rendimiento en la web (Next.js 16) y en el móvil (React Native con Expo 58). Básicamente, no se optimiza a ciegas. Se toma una pantalla, se anota una métrica de base, se declara una hipótesis, se hace **un** cambio y se vuelve a medir en las mismas condiciones. Si el número casi no se mueve, también es un resultado, y se dice.

Este es el séptimo y último tutorial de la serie **Frontend de consumidor**. Se apoya en [Primer Paso](/post/instrumentar-conversion-retencion-y-engagement) y en la [app Expo](/post/pasar-de-react-web-a-react-native-con-expo). Lo escribí el 23 de noviembre de 2026. No voy a inventar puntuaciones de Lighthouse ni milisegundos de arranque que no medí en esta bitácora: dejo el método y un cambio concreto, listo para que ustedes anoten sus cifras. El reto está en [Desafíos](/challenges/informe-antes-y-despues-de-rendimiento).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#que-vamos-a-construir)
2. [Prerrequisitos](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#prerrequisitos)
3. [Instalación](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#instalacion)
4. [Qué se mide en web y en móvil](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#que-se-mide)
5. [Paso a paso](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#paso-a-paso)
6. [Cómo probarlo](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#probarlo)
7. [Cómo agrego otra mejora de punta a punta](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#extender)
8. [Errores típicos y trampas](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#errores)
9. [Checklist](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#checklist)
10. [Resumen](/post/medir-y-mejorar-rendimiento-nextjs-y-react-native#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Un mini informe de una sola pantalla (la landing de horarios, o la lista en la app) con cuatro renglones: métrica de base, hipótesis, cambio, métrica nueva. El cambio de ejemplo en web es sacar de un Client Component lo que puede ser una RSC, o aligerar una imagen. En móvil, virtualizar una lista que se monta entera.

<a id="prerrequisitos"></a>

## Prerrequisitos

- La web Next.js 16 o la app Expo 58 de esta serie, con una pantalla real que medir.
- Chrome (Lighthouse) para la web. En Next 16, `npx next dev` y, para una medición más honesta, un `npm run build && npm run start`.
- En móvil, el perfilador que esté disponible sin pago: React Native DevTools (el camino actual en RN 0.88 / SDK 58) o las herramientas que Expo documente junto al development build. Flipper, si algún tutorial viejo lo menciona, ya no es el camino por defecto: no insistan si no arranca.

```bash
npx next --version
npx expo --version
```

<a id="instalacion"></a>

## Instalación

Lighthouse viene en Chrome DevTools: *Lighthouse* → modo navegación, dispositivo móvil o escritorio, categoría Performance. No hay que pagar. El panel de Vercel, si despliegan Primer Paso en Hobby, también muestra unas cifras: sirven de contraste, no de laboratorio perfecto.

Para el bundle de Next:

```bash
npm run build
```

El final del build lista el tamaño de cada ruta. Anoten el de `/` o el de `/horarios` **antes** del cambio. Esa línea es una métrica tan válida como Lighthouse, y más repetible en CI.

En Expo, un development build y el perfilador de React Native DevTools alcanzan. No instalo aquí una herramienta de pago.

<a id="que-se-mide"></a>

## Qué se mide en web y en móvil

En la web, lo habitual:

- LCP (*Largest Contentful Paint*): cuánto tarda en verse el bloque grande (el título, una imagen de portada).
- INP (*Interaction to Next Paint*): qué tan pronto responde un clic o un toque.
- El tamaño de JS de la ruta que acabamos de ver en `next build`.

En el móvil, lo habitual:

- Tiempo hasta que la lista de horarios es usable (no solo el *splash*).
- Frames al hacer *scroll* (¿se traban?).
- Recuento de componentes montados al abrir una lista larga.

No se comparan una medición en Wi‑Fi de casa con una en 4G del teléfono, ni un `next dev` con un `next start`. Las condiciones se anotan en el informe: dispositivo, red, build de producción o no.

<a id="paso-a-paso"></a>

## Paso a paso

**1. Captura inicial.** Abren la landing en `next start`, corren Lighthouse una vez (o tres, y anotan la mediana) y copian el tamaño de la ruta. En la app, abren la lista y graban un *scroll*. Escriben los números en una tabla, con fecha y condiciones. Si no tienen un número todavía, la tabla queda con un espacio en blanco, no con un «90» inventado.

**2. Hipótesis.** Un ejemplo honesto: «esta lista de 200 técnicos se monta entera, y por eso el *scroll* se traba». O, en la web: «el bloque de horarios es un Client Component y está arrastrando al bundle un SDK que podría quedarse fuera». Una sola hipótesis por informe.

**3. El cambio.** Uno, no cinco.

En Next, un recorte típico es dejar la lista como Server Component y marcar `'use client'` solo en el botón de reservar (el que usa `track` y el flag). El archivo de la página deja de importar `posthog-js`. El build debería mostrar menos JS en esa ruta. Otro recorte: una imagen de portada con `next/image` y un `sizes` razonable, no un PNG de 3 MB.

En React Native, una lista larga deja de ser un `.map` dentro de un `ScrollView` y pasa a `FlatList` (o a la lista con reciclaje que documente Expo 58 / Expo UI, si ya la están usando). El *item* se extrae a un componente estable.

**4. Captura final.** Las mismas condiciones. La misma herramienta. Se anota el número nuevo y la diferencia. Si LCP casi no se mueve, se escribe: «no hubo cambio apreciable». Eso evita el relato de «optimizamos todo» cuando el usuario no siente nada.

<a id="probarlo"></a>

## Cómo probarlo

El informe cabe en una página:

```text
Pantalla: landing de horarios (web)
Condiciones: Next 16, npm run start, Chrome, red local, 23 nov 2026
Base: LCP ___ s · JS de la ruta ___ kB
Hipótesis: el SDK de analítica se está yendo al bundle de la página
Cambio: el botón de reservar es el único Client Component
Después: LCP ___ s · JS de la ruta ___ kB
Conclusión: …
```

Lo mismo para la app, con *scroll* y tiempo de apertura. El reto de esta entrega es llenar **una** de esas tablas con evidencia (captura o números), no las dos obligatoriamente.

<a id="extender"></a>

## Cómo agrego otra mejora de punta a punta

Cuando exista Seiryuko En Vivo, la hipótesis puede ser «tantas conexiones de un *stream* traban la pantalla de cupos». Se mide, se agrupa el estado, se vuelve a medir. No se «agrega memo a todo» por costumbre.

<a id="errores"></a>

## Errores típicos y trampas

**Optimizar a ciegas.** `React.memo` en un componente que no se re-renderiza no se siente, y ensucia el código.

**Mirar solo `next dev`.** El modo desarrollo es más pesado. Se mide el build de producción.

**Olvidar las imágenes.** Un hero de 3 MB tapa cualquier victoria de JS.

**Una lista de 200 filas sin virtualizar.** En la web y en el móvil es el clásico. `FlatList` o una virtualización en la web, no un `map` heroico.

**Achar a React Native lo que es un *fetch* lento.** Si el perfilador muestra el tiempo en red, el arreglo es la API o una caché, no un `View` más liviano.

**Comparar su laptop con un teléfono de tres años y declararse ganadores.** Las condiciones se escriben.

<a id="checklist"></a>

## Checklist

- [ ] Elegí una sola pantalla y una sola métrica de base, con condiciones anotadas.
- [ ] Escribí la hipótesis antes de cambiar código.
- [ ] Hice un solo cambio (RSC, imagen o lista virtualizada).
- [ ] Volví a medir igual, y anoté el resultado aunque no se moviera.
- [ ] El reto está en [Desafíos](/challenges/informe-antes-y-despues-de-rendimiento).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, el rendimiento se trata como un experimento chico: base, hipótesis, un cambio, otra medida. En Next.js 16 y en Expo 58 las herramientas de la capa gratuita alcanzan. Lo que no alcanza es inventar un Lighthouse de 100 y llamarlo evidencia. Con este artículo cierra la ruta de frontend de consumidor. El ejercicio, el informe de una mejora, está en los [desafíos](/challenges/informe-antes-y-despues-de-rendimiento).
