---
title: "Cómo pasar de React web a una app React Native con Expo"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Frontend de consumidor
tags: [react, react-native, expo, typescript]
excerpt: "Una pantalla de horarios del dojo en Expo SDK 58: qué se comparte con React web, qué cambia (View, Text, Pressable) y cómo arrancar el proyecto sin pagar una cuenta de Apple."
status: published
---

Hoy vamos a ver cómo pasar de React en la web a una app React Native con Expo. Básicamente, los componentes y el modelo mental se parecen, pero el DOM se acaba: no hay `div` ni `span`. Hay `View`, `Text` y `Pressable`. Si ya han pintado algo en React (por ejemplo, una demo web como [ateliercriollo.vercel.app](https://ateliercriollo.vercel.app/)), este es el puente, no un idioma nuevo.

Este es el primer tutorial de la serie **Frontend de consumidor**. Lo escribí el 23 de noviembre de 2026 contra **Expo SDK 58** (publicado el 15 de octubre de 2026, con React Native 0.88). El ejemplo es una pantalla de horarios de un dojo, archivo por archivo. No parte de un repositorio público. El reto está en [Desafíos](/challenges/pantalla-de-horarios-en-expo).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/pasar-de-react-web-a-react-native-con-expo#que-vamos-a-construir)
2. [Prerrequisitos](/post/pasar-de-react-web-a-react-native-con-expo#prerrequisitos)
3. [Instalación](/post/pasar-de-react-web-a-react-native-con-expo#instalacion)
4. [Carpetas y responsabilidad](/post/pasar-de-react-web-a-react-native-con-expo#carpetas)
5. [Paso a paso](/post/pasar-de-react-web-a-react-native-con-expo#paso-a-paso)
6. [Cómo probarlo](/post/pasar-de-react-web-a-react-native-con-expo#probarlo)
7. [Cómo agrego otra pantalla de punta a punta](/post/pasar-de-react-web-a-react-native-con-expo#extender)
8. [Errores típicos y trampas](/post/pasar-de-react-web-a-react-native-con-expo#errores)
9. [Checklist](/post/pasar-de-react-web-a-react-native-con-expo#checklist)
10. [Resumen](/post/pasar-de-react-web-a-react-native-con-expo#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Una app Expo con una sola pantalla: la lista de horarios de la semana (Infantil el sábado, Juvenil el lunes, Adultos el miércoles). TypeScript, componentes de React Native, y un arreglo de datos local. Todavía no hay navegación, ni flags, ni tiendas. Eso llega en los siguientes artículos.

<a id="prerrequisitos"></a>

## Prerrequisitos

- Node.js 20 o superior. El 23 de noviembre de 2026, Next.js 16 pide `>=20.9.0`; Expo 58 se lleva bien con esa misma línea. Yo tengo Node v24.22.1 en la máquina de esta bitácora.
- Un teléfono con Expo Go, o un emulador. Ojo: el Expo Go nuevo de SDK 58 puede tardar unas semanas en las tiendas después de un lanzamiento. El camino más estable para un producto es un *development build*. Para este tutorial, Expo Go en SDK 58 (o el 57, si el instalador se lo ofrece mientras llega el Go nuevo) alcanza.
- **No** hace falta una cuenta de Apple Developer. Este plan no la pide.

```bash
node -v
npx expo --version
```

<a id="instalacion"></a>

## Instalación

El instalador oficial, pidiendo ya el SDK actual:

```bash
npx create-expo-app@latest seiryuko-app
cd seiryuko-app
npx expo start
```

En noviembre de 2026, `create-expo-app` recomienda SDK 58. Si el wizard pregunta y ustedes quieren Expo Go de la semana anterior, pueden elegir SDK 57; para un producto, quédense en 58 y usen un development build cuando Expo Go no baste.

`npx expo start` abre el bundler de Metro. Desde ahí, escanean el QR con Expo Go, o pulsan la tecla del emulador. `npx expo-doctor` revisa desajustes de versiones: es el comando que el propio Expo recomienda después de un upgrade.

<a id="carpetas"></a>

## Carpetas y responsabilidad

El template de Expo Router (el predeterminado reciente) se parece a esto:

```text
app/
  _layout.tsx
  index.tsx
components/
package.json
app.json
```

- `app/index.tsx` es la pantalla inicial. En Expo Router, el archivo es la ruta.
- `app/_layout.tsx` envuelve las pantallas (el *stack* o las pestañas). Lo vemos en el [siguiente artículo](/post/navegacion-y-estado-en-react-native).
- `app.json` (o `app.config.ts`) es la identidad de la app: nombre, *slug*, esquema. No pongan secretos ahí.

Si eligieron el template clásico, sin Router, verán un `App.tsx` en la raíz. El código de la pantalla es el mismo; solo cambia dónde vive el archivo. En esta serie seguimos Expo Router, porque es lo que Expo 58 está consolidando.

<a id="paso-a-paso"></a>

## Paso a paso

Lo que en la web sería un `div` con un `h1` y una lista, aquí es `View`, `Text` y `FlatList` (o un `map` si la lista es corta). Los estilos no son clases de CSS: son objetos, o una hoja `StyleSheet.create`.

```tsx
import { StyleSheet, Text, View } from 'react-native';

type Horario = {
  id: string;
  grupo: string;
  dia: string;
  hora: string;
};

const HORARIOS: Horario[] = [
  { id: 'infantil', grupo: 'Infantil', dia: 'Sábado', hora: '10:00' },
  { id: 'juvenil', grupo: 'Juvenil', dia: 'Lunes', hora: '18:00' },
  { id: 'adultos', grupo: 'Adultos', dia: 'Miércoles', hora: '19:00' },
];

export default function HorariosScreen() {
  return (
    <View style={styles.pantalla}>
      <Text style={styles.titulo}>Horarios de la semana</Text>
      {HORARIOS.map((horario) => (
        <View key={horario.id} style={styles.tarjeta}>
          <Text style={styles.grupo}>{horario.grupo}</Text>
          <Text style={styles.detalle}>
            {horario.dia} · {horario.hora}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, padding: 24, gap: 12 },
  titulo: { fontSize: 24, fontWeight: '600' },
  tarjeta: { padding: 16, borderRadius: 8, backgroundColor: '#f4f1ea' },
  grupo: { fontSize: 18, fontWeight: '600' },
  detalle: { fontSize: 16, marginTop: 4 },
});
```

Tres diferencias que importan desde el primer día:

1. **Todo texto visible va en `Text`.** Un string suelto dentro de un `View` es un error. En la web, un `div` acepta texto; aquí, no.
2. **No hay `onClick`.** El componente táctil es `Pressable` (o `Button`). `Pressable` es el más flexible.
3. **`flex` es el layout.** `flex: 1` para que la pantalla ocupe el alto. `gap` ya funciona en React Native reciente; si algo viejo se queja, usan `margin` en los hijos.

El tipo `Horario` es el mismo que usarían en una web TypeScript. Esa es la parte que sí se comparte: tipos, funciones puras, el arreglo de horarios. Lo que no se comparte es el componente visual.

<a id="probarlo"></a>

## Cómo probarlo

```bash
npx expo start
```

Abren la app en Expo Go o en el emulador. Deben ver las tres tarjetas: Infantil, Juvenil y Adultos. Si cambian el título y guardan, Fast Refresh debería actualizar sin perder el estado de la pantalla (en una pantalla tan simple, casi no hay estado que perder).

Para comprobar versiones del proyecto:

```bash
npx expo-doctor
```

Si *doctor* lista un paquete desalineado, `npx expo install --fix` es el arreglo oficial, no un `npm install paquete@a-ojo`.

<a id="extender"></a>

## Cómo agrego otra pantalla de punta a punta

Una pantalla «detalle del grupo» espera al [artículo de navegación](/post/navegacion-y-estado-en-react-native). Hoy, sin rutas todavía, pueden extraer un componente `TarjetaHorario` a `components/TarjetaHorario.tsx` y dejar `app/index.tsx` más flaco. El tipo `Horario` se va a un archivo `types/horario.ts` para reutilizarlo después en la web de Primer Paso, si comparten un paquete de tipos.

<a id="errores"></a>

## Errores típicos y trampas

**Poner un `<div>` o un `className`.** Es el primer reflejo si vienen de la web. El error de Metro suele ser claro: el componente no existe. Cámbienlo a `View` y a `style`.

**Texto suelto fuera de `Text`.** En Android revienta. En iOS a veces también. Envuelvan siempre.

**Instalar `react-native-foo` con npm a ojo, en lugar de `npx expo install`.** Expo pinnea versiones compatibles con el SDK. Un paquete «más nuevo» puede romper el build nativo.

**Creer que hace falta pagar Apple para ver la app.** Expo Go y un APK de Android alcanzan para esta serie. El pipeline de tiendas llega en el [artículo de EAS](/post/pipeline-de-liberacion-con-eas-y-github-actions), y iOS se documenta, no se exige.

**Correr SDK 58 con un Expo Go que todavía es 57.** El QR abre y se queja de la versión. O actualizan Go, o hacen un development build, o temporalmente un proyecto 57. No es un fallo de su código.

<a id="checklist"></a>

## Checklist

- [ ] `npx expo start` abre el bundler.
- [ ] La pantalla muestra tres horarios del dojo.
- [ ] No hay `div`, `span` ni texto fuera de `Text`.
- [ ] `npx expo-doctor` no deja advertencias graves.
- [ ] El reto está en [Desafíos](/challenges/pantalla-de-horarios-en-expo).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, pasar a React Native con Expo no es aprender React otra vez. Es aprender las piezas nativas (`View`, `Text`, `Pressable`, `StyleSheet`) y dejar que Expo SDK 58 arme el puente. La pantalla de horarios es deliberadamente chica: el piso para la navegación, los flags y el pipeline que vienen después.

El ejercicio está en los [desafíos](/challenges/pantalla-de-horarios-en-expo). En el [siguiente artículo](/post/navegacion-y-estado-en-react-native) esa pantalla gana rutas y un estado que se puede explicar.
