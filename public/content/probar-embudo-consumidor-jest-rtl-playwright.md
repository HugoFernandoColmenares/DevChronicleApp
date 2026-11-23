---
title: "Cómo probar un embudo de consumidor con Jest, React Testing Library y Playwright"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Frontend de consumidor
tags: [jest, playwright, testing-library, nextjs, tests]
excerpt: "Tres capas de prueba para el embudo de la primera clase: un unitario del CTA, un componente con React Testing Library y un recorrido Playwright de visita a reserva, sin red de pago."
status: published
---

Hoy vamos a ver cómo probar un embudo de consumidor con Jest, React Testing Library y Playwright. Básicamente, cada herramienta mira un corte distinto: la función del texto, el botón en aislamiento, y el recorrido en el navegador. Si solo hay un test del `textoCta`, un cambio en la ruta puede romper la reserva y nadie se entera.

Este es el quinto tutorial de la serie **Frontend de consumidor**. Parte del [embudo](/post/instrumentar-conversion-retencion-y-engagement) y del [flag del CTA](/post/experimentos-ab-y-feature-flags-con-posthog). Lo escribí el 23 de noviembre de 2026, pensando en **Next.js 16** y en la app Expo. El reto está en [Desafíos](/challenges/test-del-embudo-reserva).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/probar-embudo-consumidor-jest-rtl-playwright#que-vamos-a-construir)
2. [Prerrequisitos](/post/probar-embudo-consumidor-jest-rtl-playwright#prerrequisitos)
3. [Instalación](/post/probar-embudo-consumidor-jest-rtl-playwright#instalacion)
4. [Carpetas y responsabilidad](/post/probar-embudo-consumidor-jest-rtl-playwright#carpetas)
5. [Paso a paso](/post/probar-embudo-consumidor-jest-rtl-playwright#paso-a-paso)
6. [Cómo probarlo](/post/probar-embudo-consumidor-jest-rtl-playwright#probarlo)
7. [Cómo agrego otra prueba de punta a punta](/post/probar-embudo-consumidor-jest-rtl-playwright#extender)
8. [Errores típicos y trampas](/post/probar-embudo-consumidor-jest-rtl-playwright#errores)
9. [Checklist](/post/probar-embudo-consumidor-jest-rtl-playwright#checklist)
10. [Resumen](/post/probar-embudo-consumidor-jest-rtl-playwright#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Tres pruebas:

1. Jest (o el runner que traiga Next 16, que a veces es Vitest en plantillas nuevas: el ejemplo es el mismo) para `textoCta`.
2. React Testing Library para el botón: pulsar dispara `reserva_iniciada` (con un *mock* de `track`).
3. Playwright: visita `/`, pulsa un grupo, confirma, y ve un texto de «reservado».

<a id="prerrequisitos"></a>

## Prerrequisitos

El proyecto Next de Primer Paso, con el botón y el contrato de eventos. Node 20.9+.

<a id="instalacion"></a>

## Instalación

En muchos proyectos Next 16 ya hay un runner. Si no hay Playwright:

```bash
npm init playwright@latest
```

React Testing Library:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Si la plantilla usa Vitest en lugar de Jest, los `test` y `expect` se parecen. No reescribo la misma idea en dos runners. El comando de la plantilla (`npm test` / `npx vitest`) es el que vale.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
lib/flags/cta.test.ts
components/BotonReservar.test.tsx
e2e/reserva.spec.ts
```

- El unitario no renderiza React.
- El de componente no abre Chrome.
- El de Playwright no se mete a implementar el flag: recorre la app como una persona.

<a id="paso-a-paso"></a>

## Paso a paso

El unitario:

```ts
import { textoCta } from './cta';

test('el control y la variante urgente tienen textos distintos', () => {
  expect(textoCta('control')).toBe('Reservar cupo de prueba');
  expect(textoCta('urgente')).toBe('Reserva tu primera clase hoy');
});
```

El de componente, con `track` simulado:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BotonReservar } from './BotonReservar';
import { track } from '@/lib/analytics/track';

jest.mock('@/lib/analytics/track', () => ({
  track: jest.fn(),
}));

test('al pulsar se dispara reserva_iniciada', async () => {
  const user = userEvent.setup();
  render(<BotonReservar grupoId="juvenil" />);
  await user.click(screen.getByRole('button'));
  expect(track).toHaveBeenCalledWith({
    nombre: 'reserva_iniciada',
    props: { grupoId: 'juvenil' },
  });
});
```

Si usan Vitest, `jest.mock` pasa a `vi.mock` y `jest.fn` a `vi.fn`. El aserto es el mismo.

Playwright, feliz, sin PostHog de verdad (el `.env` de e2e puede omitir la clave; `track` no debe romper la página):

```ts
import { expect, test } from '@playwright/test';

test('una visitante reserva un cupo de prueba', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Juvenil/i }).click();
  await page.getByRole('button', { name: /Reservar/i }).click();
  await expect(page.getByText(/reservado/i)).toBeVisible();
});
```

Los nombres accesibles (`getByRole`) importan: si el botón no tiene un rol o un texto, el test se vuelve frágil o, peor, la app es difícil de usar.

<a id="probarlo"></a>

## Cómo probarlo

```bash
npm test
npx playwright test e2e/reserva.spec.ts
```

El unitario y el de componente deben pasar sin levantar el servidor. Playwright necesita la app en marcha (`npx playwright test` suele arrancarla si `playwright.config` tiene `webServer`). Si el recorrido falla, el trace de Playwright muestra la captura: no adivinen.

<a id="extender"></a>

## Cómo agrego otra prueba de punta a punta

Un caso negativo de Playwright: un grupo lleno, con el flag `lista_espera` encendido, muestra «apuntarme a la lista» y no «Reservar». Eso documenta Seiryuko En Vivo antes de construirlo del todo. También un test de la Policy equivalente, si la reserva pasa por un API: 403 cuando el cupo ya no existe.

<a id="errores"></a>

## Errores típicos y trampas

**Un test de Playwright que espera 200 ms «por si acaso».** Usen `expect(locator).toBeVisible()` y que Playwright reintente solo.

**Mockear PostHog a medias y que el test de componente llame a la red.** El *mock* de `track` tiene que estar antes del import útil. Si no, el primer test «pasa» y el CI, no.

**Probar solo el *happy path*.** Un embudo se rompe en el paso dos. Agreguen el caso «el servidor rechaza el cupo» cuando exista.

**Selectores por clase CSS (`div.btn-primary`).** El día que Tailwind cambie la clase, el test muere y la app no. `getByRole` es más estable.

**Correr Playwright contra producción.** Estos tests son de local y de CI. No golpee el dojo de verdad.

<a id="checklist"></a>

## Checklist

- [ ] El unitario de `textoCta` está en verde.
- [ ] El test del botón afirma `reserva_iniciada` con el `grupoId`.
- [ ] Playwright recorre visita → reserva → confirmación visible.
- [ ] No hay esperas fijas de milisegundos a ojo.
- [ ] El reto está en [Desafíos](/challenges/test-del-embudo-reserva).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, el embudo se testea en tres capas, cada una con lo suyo. Jest o Vitest para la función, Testing Library para el botón, Playwright para la persona. En el [siguiente artículo](/post/pipeline-de-liberacion-con-eas-y-github-actions) esas pruebas se sientan en un pipeline de liberación, junto a EAS.

El ejercicio está en los [desafíos](/challenges/test-del-embudo-reserva).
