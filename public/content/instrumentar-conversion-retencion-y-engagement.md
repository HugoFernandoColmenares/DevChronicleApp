---
title: "Cómo instrumentar conversión, retención y engagement en un producto de consumidor"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Frontend de consumidor
tags: [producto, metricas, posthog, nextjs, analitica]
excerpt: "Un embudo de primera clase de prueba en el dojo: visita, reserva, asistencia y segunda clase, con eventos nombrados en PostHog (capa gratuita) y un contrato que el código no puede contradecir."
status: published
---

Hoy vamos a ver cómo instrumentar conversión, retención y *engagement* en un producto de consumidor. Básicamente, no basta con «poner Analytics y ya». Hay que decir qué es una conversión (reservó la primera clase), qué es retención (volvió a una segunda) y qué es engagement (abrió el horario dos veces en la semana), y dejar esos nombres escritos en el código.

Este es el tercer tutorial de la serie **Frontend de consumidor**. Encaja con el sitio **Seiryuko Primer Paso** (Next.js 16) y, más adelante, con la app Expo. Lo escribí el 23 de noviembre de 2026. PostHog tiene capa gratuita; GrowthBook también, si prefieren separar flags y analitica. Firebase se queda en Spark y no entra aquí. El reto está en [Desafíos](/challenges/contrato-de-eventos-del-embudo).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/instrumentar-conversion-retencion-y-engagement#que-vamos-a-construir)
2. [Prerrequisitos](/post/instrumentar-conversion-retencion-y-engagement#prerrequisitos)
3. [Instalación](/post/instrumentar-conversion-retencion-y-engagement#instalacion)
4. [Carpetas y responsabilidad](/post/instrumentar-conversion-retencion-y-engagement#carpetas)
5. [Paso a paso](/post/instrumentar-conversion-retencion-y-engagement#paso-a-paso)
6. [Cómo probarlo](/post/instrumentar-conversion-retencion-y-engagement#probarlo)
7. [Cómo agrego otro evento de punta a punta](/post/instrumentar-conversion-retencion-y-engagement#extender)
8. [Errores típicos y trampas](/post/instrumentar-conversion-retencion-y-engagement#errores)
9. [Checklist](/post/instrumentar-conversion-retencion-y-engagement#checklist)
10. [Resumen](/post/instrumentar-conversion-retencion-y-engagement#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Un contrato de eventos para el embudo de la primera clase de prueba:

1. `visita_horarios` — abrió la grilla.
2. `reserva_iniciada` — pulsó «reservar» en un grupo.
3. `reserva_confirmada` — el cupo quedó guardado.
4. `asistencia_marcada` — llegó a la clase (esto suele nacer en recepción, no en el visitante).
5. `segunda_clase_reservada` — la retención, la que importa.

Y un módulo TypeScript que es la única puerta para dispararlos, en la web (Next.js 16.4.x, App Router) o, con el mismo nombre de evento, en la app.

<a id="prerrequisitos"></a>

## Prerrequisitos

- Una cuenta gratuita de PostHog (o GrowthBook, si solo van a hacer flags en el [siguiente artículo](/post/experimentos-ab-y-feature-flags-con-posthog) y dejan la analitica para después).
- Un proyecto Next.js 16 o la app Expo de esta serie. Node 20.9 o superior.
- La clave de PostHog **nunca** va en un repositorio. En Next, `NEXT_PUBLIC_POSTHOG_KEY` en `.env.local`.

<a id="instalacion"></a>

## Instalación

En un proyecto Next.js 16 (el estable actual, el 23 de noviembre de 2026, es **16.4.6**):

```bash
npx create-next-app@16 seiryuko-primer-paso
cd seiryuko-primer-paso
npm install posthog-js
```

PostHog documenta un proveedor para App Router. El patrón es un componente cliente que llama `posthog.init` una vez, con la clave pública y el host de su instancia (el de la capa gratis, no un proxy de pago).

```tsx
'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) {
      return;
    }
    posthog.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST });
  }, []);

  return children;
}
```

Si la clave no está, el proveedor no hace nada. Así un `npm run dev` local no explota cuando todavía no hay cuenta.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
lib/analytics/eventos.ts
lib/analytics/track.ts
app/layout.tsx
```

- `eventos.ts` es el contrato: nombres y propiedades permitidas. Si un nombre no está ahí, no se dispara.
- `track.ts` es la única función que habla con PostHog.
- Las páginas no importan `posthog` directo. Importan `track`.

<a id="paso-a-paso"></a>

## Paso a paso

El contrato, bien estrecho:

```ts
export type EventoEmbudo =
  | { nombre: 'visita_horarios'; props: { origen: 'web' | 'app' } }
  | { nombre: 'reserva_iniciada'; props: { grupoId: string } }
  | { nombre: 'reserva_confirmada'; props: { grupoId: string } }
  | { nombre: 'asistencia_marcada'; props: { grupoId: string; fecha: string } }
  | { nombre: 'segunda_clase_reservada'; props: { grupoId: string } };

export type NombreEvento = EventoEmbudo['nombre'];
```

Y la función:

```ts
import posthog from 'posthog-js';
import type { EventoEmbudo } from './eventos';

export function track(evento: EventoEmbudo): void {
  if (typeof window === 'undefined') {
    return;
  }
  posthog.capture(evento.nombre, evento.props);
}
```

En la página de horarios, un cliente pequeño dispara la visita una vez:

```tsx
'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics/track';

export function RegistrarVisita() {
  useEffect(() => {
    track({ nombre: 'visita_horarios', props: { origen: 'web' } });
  }, []);

  return null;
}
```

Y en el botón de reservar:

```ts
track({ nombre: 'reserva_iniciada', props: { grupoId: horario.id } });
// …confirmar en el servidor…
track({ nombre: 'reserva_confirmada', props: { grupoId: horario.id } });
```

Conversión, en este producto, es `reserva_confirmada / visita_horarios`. Retención es `segunda_clase_reservada / reserva_confirmada`. Engagement, por ahora, puede ser «volvió a `visita_horarios` en siete días». Esos cocientes se arman en PostHog con *insights*, no con un `console.log`. El código solo garantiza que los nombres no bailan.

<a id="probarlo"></a>

## Cómo probarlo

Arrancan la web, abren la grilla, reservan un cupo. En PostHog, el *live events* (o el equivalente de su plan gratuito) debe mostrar `visita_horarios` y `reserva_iniciada` / `reserva_confirmada` con el `grupoId`. Si no aparece nada, lo primero es mirar si `NEXT_PUBLIC_POSTHOG_KEY` está en el proceso de Next (hay que reiniciar `npm run dev` después de crear el `.env.local`).

Un test unitario del contrato, sin red:

```ts
it('no acepta un nombre inventado', () => {
  // TypeScript ya lo impide: track({ nombre: 'click_boton_azul', props: {} }) no compila.
  expect(true).toBe(true);
});
```

El valor real de ese test es el tipo, no la aserción. El test de integración (un *mock* de `posthog.capture`) llega en el [artículo del embudo con Jest y Playwright](/post/probar-embudo-consumidor-jest-rtl-playwright).

<a id="extender"></a>

## Cómo agrego otro evento de punta a punta

Para `lista_espera_apuntada` (cuando el grupo está lleno, en Seiryuko En Vivo):

1. Agregan el caso al *union* de `EventoEmbudo`, con `grupoId`.
2. Lo disparan en el mismo `track()`, nunca con un string suelto.
3. Lo documentan en una tabla «evento → significado → dónde se dispara».
4. Recién entonces lo buscan en PostHog.

<a id="errores"></a>

## Errores típicos y trampas

**Disparar `reserva_confirmada` al pulsar el botón, antes de que el servidor acepte.** Eso infla la conversión. El evento de éxito va después de la respuesta buena.

**Un evento `click` por cada botón, sin nombre de negocio.** Después nadie sabe qué era `btn_3`. El nombre habla del dojo, no del widget.

**Poner la clave secreta de PostHog (la de servidor) en `NEXT_PUBLIC_`.** Lo público es la de proyecto, pensada para el navegador. La de servidor no se embebe.

**Medir solo en desarrollo y celebrar 100 % de conversión.** Su usuario son ustedes. Un *insight* se lee cuando hay tráfico de verdad, o se declara como prueba.

**Un nombre distinto en la app y en la web.** `reservaConfirmada` vs `reserva_confirmada`. El contrato existe para que no pase.

<a id="checklist"></a>

## Checklist

- [ ] El *union* de eventos está en un solo archivo.
- [ ] Las páginas llaman `track()`, no `posthog.capture` directo.
- [ ] Hay distinción clara entre iniciada y confirmada.
- [ ] PostHog (free) muestra los eventos después de un recorrido manual, o el `.env.local` está documentado si todavía no hay cuenta.
- [ ] El reto está en [Desafíos](/challenges/contrato-de-eventos-del-embudo).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, instrumentar un producto de consumidor es ponerle nombre al embudo y no dejar que el código se salga de ese vocabulario. Conversión, retención y engagement dejan de ser palabras de una vacante y se vuelven eventos con propiedades. En el [siguiente artículo](/post/experimentos-ab-y-feature-flags-con-posthog) esos eventos alimentan un A/B de verdad, no un `if (Math.random())`.

El ejercicio está en los [desafíos](/challenges/contrato-de-eventos-del-embudo).
