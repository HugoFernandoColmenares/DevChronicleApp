---
title: "Cómo pensar la navegación y el estado en React Native (sin pelearte con lo que ya sabes de React)"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Frontend de consumidor
tags: [react, react-native, expo, expo-router, estado]
excerpt: "Expo Router en SDK 58: un stack de horarios y detalle de grupo, params tipados, y el estado de un cupo que vive en un contexto, no en un UseEffect copiado de la web."
status: published
---

Hoy vamos a ver cómo pensar la navegación y el estado en React Native sin pelearnos con lo que ya sabemos de React. Básicamente, Expo Router trata los archivos como rutas, igual que el App Router de Next.js, y el estado sigue siendo estado de React: o es local, o sube a un contexto, o viene de un fetch. Lo que cambia es el contenedor: no hay `react-router` de la web ni una barra de direcciones a la vista.

Este es el segundo tutorial de la serie **Frontend de consumidor**. Parte de la [pantalla de horarios en Expo](/post/pasar-de-react-web-a-react-native-con-expo). Lo escribí el 23 de noviembre de 2026 contra **Expo SDK 58**, donde Expo Router ya trae *data loaders* estables y pestañas nativas. El reto está en [Desafíos](/challenges/stack-horarios-y-detalle).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/navegacion-y-estado-en-react-native#que-vamos-a-construir)
2. [Prerrequisitos](/post/navegacion-y-estado-en-react-native#prerrequisitos)
3. [Instalación](/post/navegacion-y-estado-en-react-native#instalacion)
4. [Carpetas y responsabilidad](/post/navegacion-y-estado-en-react-native#carpetas)
5. [Paso a paso](/post/navegacion-y-estado-en-react-native#paso-a-paso)
6. [Cómo probarlo](/post/navegacion-y-estado-en-react-native#probarlo)
7. [Cómo agrego otra ruta de punta a punta](/post/navegacion-y-estado-en-react-native#extender)
8. [Errores típicos y trampas](/post/navegacion-y-estado-en-react-native#errores)
9. [Checklist](/post/navegacion-y-estado-en-react-native#checklist)
10. [Resumen](/post/navegacion-y-estado-en-react-native#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Un *stack*: la lista de horarios y, al pulsar una tarjeta, el detalle de ese grupo (`/grupo/[id]`), con un botón «reservar cupo de prueba» que guarda el `id` reservado en un contexto. Sin un backend todavía.

<a id="prerrequisitos"></a>

## Prerrequisitos

El proyecto Expo 58 del artículo anterior. TypeScript. Comandos:

```bash
npx expo start
```

Si el template ya trajo `app/_layout.tsx`, no instalan un navegador extra. Expo Router viaja con el SDK.

<a id="instalacion"></a>

## Instalación

Si el proyecto no tiene Expo Router (un template viejo con solo `App.tsx`), el camino oficial es crearlo de nuevo con el template por defecto o seguir la guía de «entry point» de Expo Router. En un `create-expo-app` reciente, ya está. No instalen `react-navigation` a mano «por si acaso»: Router se apoya en él por debajo, y mezclar los dos en la misma app es una fuente clásica de dolores.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
app/
  _layout.tsx
  index.tsx
  grupo/
    [id].tsx
context/
  ReservaContext.tsx
data/
  horarios.ts
```

- `app/_layout.tsx` declara el *stack* y envuelve el contexto.
- `app/index.tsx` lista. No sabe cómo se guarda una reserva.
- `app/grupo/[id].tsx` lee el `id` de la ruta.
- El contexto guarda «qué grupo reservé en esta sesión». No es un store global para todo el dojo.

<a id="paso-a-paso"></a>

## Paso a paso

El layout del *stack*, con el proveedor de reservas por fuera, para que las dos pantallas vean lo mismo:

```tsx
import { Stack } from 'expo-router';
import { ReservaProvider } from '../context/ReservaContext';

export default function Layout() {
  return (
    <ReservaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Horarios' }} />
        <Stack.Screen name="grupo/[id]" options={{ title: 'Grupo' }} />
      </Stack>
    </ReservaProvider>
  );
}
```

El contexto es React puro. Les va a sonar de la web:

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type ReservaContextValue = {
  grupoReservadoId: string | null;
  reservar: (id: string) => void;
};

const ReservaContext = createContext<ReservaContextValue | null>(null);

export function ReservaProvider({ children }: { children: ReactNode }) {
  const [grupoReservadoId, setGrupoReservadoId] = useState<string | null>(null);

  function reservar(id: string) {
    setGrupoReservadoId(id);
  }

  return (
    <ReservaContext.Provider value={{ grupoReservadoId, reservar }}>
      {children}
    </ReservaContext.Provider>
  );
}

export function useReserva() {
  const valor = useContext(ReservaContext);
  if (!valor) {
    throw new Error('useReserva debe usarse dentro de ReservaProvider');
  }
  return valor;
}
```

En la lista, la navegación es un `Link` o un `router.push`. El `href` se parece a Next:

```tsx
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { HORARIOS } from '../data/horarios';
import { useReserva } from '../context/ReservaContext';

export default function HorariosScreen() {
  const { grupoReservadoId } = useReserva();

  return (
    <View>
      {HORARIOS.map((horario) => (
        <Link key={horario.id} href={`/grupo/${horario.id}`} asChild>
          <Pressable>
            <Text>{horario.grupo}</Text>
            {grupoReservadoId === horario.id ? <Text>Reservado</Text> : null}
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
```

`asChild` hace que el `Pressable` sea el elemento táctil, no un envoltorio extra. En el detalle, `useLocalSearchParams` entrega el `id`. Puede llegar como string o como arreglo; lo normalizo:

```tsx
import { useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { HORARIOS } from '../../data/horarios';
import { useReserva } from '../../context/ReservaContext';

export default function GrupoScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const horario = HORARIOS.find((item) => item.id === id);
  const { grupoReservadoId, reservar } = useReserva();

  if (!horario) {
    return <Text>Ese grupo no está en la grilla.</Text>;
  }

  const yaReservado = grupoReservadoId === horario.id;

  return (
    <View>
      <Text>{horario.grupo}</Text>
      <Text>{horario.dia} · {horario.hora}</Text>
      <Pressable onPress={() => reservar(horario.id)} disabled={yaReservado}>
        <Text>{yaReservado ? 'Cupo reservado' : 'Reservar cupo de prueba'}</Text>
      </Pressable>
    </View>
  );
}
```

El estado no vive en la ruta. Si lo pusiera solo en el detalle, al volver a la lista se perdería el sello «Reservado». Por eso el contexto envuelve el *stack*.

En SDK 58, si usan pestañas nativas, el import oficial pasó a `expo-router/native-tabs` (antes era `expo-router/unstable-native-tabs`). Si copian un tutorial de 2025 con la ruta vieja, el build se queja. Esta entrega se queda en `Stack`, que no cambió de sitio.

<a id="probarlo"></a>

## Cómo probarlo

```bash
npx expo start
```

Pulsen Juvenil, reserven el cupo, vuelvan atrás (gesto o botón del *stack*). La lista debe mostrar «Reservado» en Juvenil. Si recargan la app por completo, el contexto vuelve a `null`: todavía no hay persistencia. Es honesto decirlo. Async Storage o un backend llegan cuando haya algo que valga la pena guardar.

<a id="extender"></a>

## Cómo agrego otra ruta de punta a punta

Una pantalla `/reserva` que resume «tienen un cupo en Juvenil, lunes 18:00»:

1. `app/reserva.tsx`.
2. La registran en el `Stack` con un título.
3. Si `grupoReservadoId` es `null`, muestran un vacío y un enlace a `/`.
4. Un test de lógica (la función que busca el horario por id) puede vivir en Jest, sin renderizar el *stack* entero. El render de la pantalla llega en el [artículo de pruebas del embudo](/post/probar-embudo-consumidor-jest-rtl-playwright).

<a id="errores"></a>

## Errores típicos y trampas

**Leer `params.id` como si siempre fuera string.** A veces es `string[]`. Normalicen.

**Meter el fetch en un `useEffect` copiado de un blog de 2019 y pelearse con el doble montaje.** En Router, los *data loaders* estables de SDK 58 son el camino nuevo. Si todavía usan `useEffect`, cancelen o ignoren la respuesta vieja. No es un pecado; es una trampa conocida.

**Un contexto para todo: usuario, flags, horarios, el color del botón.** El contexto de esta entrega tiene una sola pregunta. Los flags van en el [artículo de PostHog](/post/experimentos-ab-y-feature-flags-con-posthog).

**Mezclar `router.push` de `expo-router` con `navigation.navigate` de React Navigation en la misma pantalla.** Elijan Router y quédense ahí.

**Olvidar `asChild` y anidar dos zonas táctiles.** El toque «no responde» y parece un bug de Android.

<a id="checklist"></a>

## Checklist

- [ ] Existe un *stack* con lista y detalle.
- [ ] El `id` del grupo viaja en la URL de Router.
- [ ] Reservar en el detalle se ve en la lista al volver.
- [ ] Recargar la app borra la reserva (todavía no hay persistencia, y está bien).
- [ ] El reto está en [Desafíos](/challenges/stack-horarios-y-detalle).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, la navegación en Expo Router se parece más a Next que a un `div` con `onClick`. El estado sigue siendo React: un contexto chico para el cupo, *params* para el id, y nada de un store global «por si acaso». En el [siguiente artículo](/post/instrumentar-conversion-retencion-y-engagement) ese cupo se convierte en un evento que se puede medir.

El ejercicio está en los [desafíos](/challenges/stack-horarios-y-detalle).
