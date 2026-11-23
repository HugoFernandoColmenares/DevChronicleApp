---
title: "Cómo diseñar un experimento A/B y feature flags con PostHog o GrowthBook (y un poco de estadística para no mentirte)"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Frontend de consumidor
tags: [ab-testing, feature-flags, posthog, growthbook, producto]
excerpt: "Un flag checkout_cta y un A/B del texto del botón de reserva en PostHog o GrowthBook (capa gratuita), con una regla sencilla para no cantar ganador el día uno."
status: published
---

Hoy vamos a ver cómo diseñar un experimento A/B y *feature flags* con PostHog o GrowthBook, y un poco de estadística para no mentirnos. Básicamente, un flag no es un `if (usuario.id === 'yo')` en el código, y un A/B no se «gana» con veinte visitas. El evento `reserva_confirmada` del [artículo anterior](/post/instrumentar-conversion-retencion-y-engagement) es la métrica; el flag decide qué texto ve cada persona.

Este es el cuarto tutorial de la serie **Frontend de consumidor**. Lo escribí el 23 de noviembre de 2026. PostHog y GrowthBook tienen capa gratuita, equivalentes razonables a LaunchDarkly u Optimizely para este tamaño. El reto está en [Desafíos](/challenges/disenar-experimento-ab-del-cta).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/experimentos-ab-y-feature-flags-con-posthog#que-vamos-a-construir)
2. [Prerrequisitos](/post/experimentos-ab-y-feature-flags-con-posthog#prerrequisitos)
3. [Instalación](/post/experimentos-ab-y-feature-flags-con-posthog#instalacion)
4. [Carpetas y responsabilidad](/post/experimentos-ab-y-feature-flags-con-posthog#carpetas)
5. [Paso a paso](/post/experimentos-ab-y-feature-flags-con-posthog#paso-a-paso)
6. [Cómo probarlo](/post/experimentos-ab-y-feature-flags-con-posthog#probarlo)
7. [Cómo agrego otro flag de punta a punta](/post/experimentos-ab-y-feature-flags-con-posthog#extender)
8. [Errores típicos y trampas](/post/experimentos-ab-y-feature-flags-con-posthog#errores)
9. [Checklist](/post/experimentos-ab-y-feature-flags-con-posthog#checklist)
10. [Resumen](/post/experimentos-ab-y-feature-flags-con-posthog#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Un flag `checkout_cta` con dos variantes, `control` y `urgente`, que cambia el texto del botón: «Reservar cupo de prueba» vs «Reserva tu primera clase hoy». La métrica primaria es `reserva_confirmada`. Y una regla escrita: no cantamos ganador con menos de un mínimo de exposiciones, ni el primer día.

<a id="prerrequisitos"></a>

## Prerrequisitos

El contrato de eventos ya disparando. Una cuenta free de PostHog (tiene flags y experimentos en el mismo producto) o de GrowthBook (flags, y puede leer eventos de PostHog u otra fuente). Comandos: el SDK ya instalado en el artículo anterior.

<a id="instalacion"></a>

## Instalación

Si siguen en PostHog, no instalan otro paquete: `posthog-js` ya trae `getFeatureFlag` / `isFeatureEnabled`. Si prefieren GrowthBook:

```bash
npm install @growthbook/growthbook-react
```

En App Router, el proveedor de GrowthBook es un componente cliente, con el *client key* público en `NEXT_PUBLIC_GROWTHBOOK_KEY`. El patrón es el mismo que con PostHog: si la clave no está, hay un valor por defecto (`control`) y la app no se cae.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
lib/flags/cta.ts
components/BotonReservar.tsx
```

- `cta.ts` traduce el valor del flag a un texto. Las páginas no preguntan a PostHog por un string mágico.
- El componente pinta el texto y dispara los eventos de reserva que ya existen.

<a id="paso-a-paso"></a>

## Paso a paso

En PostHog crean un *feature flag* `checkout_cta` con *release conditions* al 50/50, o un experimento que use ese flag. Las dos variantes: `control` y `urgente`. La *goal metric* es el evento `reserva_confirmada`.

En el código:

```ts
import posthog from 'posthog-js';

export type VarianteCta = 'control' | 'urgente';

export function varianteCta(): VarianteCta {
  const valor = posthog.getFeatureFlag('checkout_cta');
  return valor === 'urgente' ? 'urgente' : 'control';
}

export function textoCta(variante: VarianteCta): string {
  return variante === 'urgente'
    ? 'Reserva tu primera clase hoy'
    : 'Reservar cupo de prueba';
}
```

El botón:

```tsx
'use client';

import { textoCta, varianteCta } from '@/lib/flags/cta';
import { track } from '@/lib/analytics/track';

export function BotonReservar({ grupoId }: { grupoId: string }) {
  const variante = varianteCta();

  function onReservar() {
    track({ nombre: 'reserva_iniciada', props: { grupoId } });
    // confirmar en el servidor, y si va bien:
    track({ nombre: 'reserva_confirmada', props: { grupoId } });
  }

  return (
    <button type="button" onClick={onReservar}>
      {textoCta(variante)}
    </button>
  );
}
```

Un poco de estadística, dicha en voz baja. Un A/B se mira cuando hay **exposición** (la persona vio el botón) y **conversión** (confirmó la reserva). El cociente es conversiones / exposiciones, **por variante**. No se compara «hoy ganó urgente porque hubo 8 reservas y el control tuvo 6» si una variante se mostró más, o si el fin de semana no se parece al lunes.

Una regla práctica, que no sustituye a un estadístico pero evita mentirse:

- no se mira el resultado el mismo día del lanzamiento;
- no se declara ganador con pocas decenas de exposiciones;
- si el *p-value* o el intervalo que muestre PostHog/GrowthBook todavía cruza el cero (no hay diferencia clara), el resultado es «todavía no sabemos», y eso también se cuenta;
- se deja el experimento correr el tiempo que uno escribió **antes** de mirar, no el tiempo hasta que «sale bonito».

No voy a inventar aquí un número mágico de muestra. Depende del tráfico. En un dojo pequeño, puede tardar semanas. Es más honesto decirlo que disfrazarlo de ciencia.

<a id="probarlo"></a>

## Cómo probarlo

En PostHog o GrowthBook pueden forzar la variante para su usuario (`override`). Recargan la landing: el botón debe decir el texto de esa variante. Cambian el override a la otra, recargan, cambia el texto. Sin override, la asignación debe ser estable: la misma persona no ve `control` el lunes y `urgente` el martes, salvo que apaguen el flag.

En desarrollo, un test de `textoCta` no necesita red:

```ts
expect(textoCta('control')).toBe('Reservar cupo de prueba');
expect(textoCta('urgente')).toBe('Reserva tu primera clase hoy');
```

<a id="extender"></a>

## Cómo agrego otro flag de punta a punta

Un flag `lista_espera` (boolean) para mostrar o no el apuntarse cuando el grupo está lleno:

1. Lo crean en PostHog/GrowthBook, apagado por defecto.
2. Una función `listaEsperaActiva(): boolean`.
3. La pantalla de detalle lo consulta y no implementa un `if` suelto con un comentario «TODO quitar».
4. Cuando lo encienden para un 10 %, miden un evento ya existente o uno nuevo del contrato, no un *click* anónimo.

<a id="errores"></a>

## Errores típicos y trampas

**Un `Math.random() < 0.5` en el componente.** Cada render puede cambiar de variante. Eso rompe el experimento. El flag tiene que ser estable por usuario.

**Cantar ganador el día uno.** Es el camino más rápido a un botón peor en producción.

**Usar una métrica de vanidad** (`visita_horarios`) como meta del A/B del CTA. El CTA se juzga por `reserva_confirmada`.

**Dejar el override de desarrollo encendido y pensar que «el 80 % convierte».** Estaban viendo solo su variante.

**Poner el flag en el servidor y en el cliente con distinta clave.** La persona ve un texto en HTML y otro después del hidrato. Elige un lugar, o usen el mismo identificador de usuario en los dos.

<a id="checklist"></a>

## Checklist

- [ ] Existe el flag `checkout_cta` con `control` y `urgente`.
- [ ] El texto sale de una función, no de un `if` en el JSX suelto.
- [ ] La métrica del experimento es `reserva_confirmada`.
- [ ] Escribí la regla de «cuándo se mira el resultado» antes de lanzar.
- [ ] El reto está en [Desafíos](/challenges/disenar-experimento-ab-del-cta).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, un flag de verdad y un A/B de verdad son un contrato: variantes estables, una métrica de negocio, y la paciencia de no declararse ganador con la primera mañana. PostHog o GrowthBook, en capa gratuita, alcanzan para practicarlo. En el [siguiente artículo](/post/probar-embudo-consumidor-jest-rtl-playwright) este botón se testea sin abrir la cuenta.

El ejercicio está en los [desafíos](/challenges/disenar-experimento-ab-del-cta).
