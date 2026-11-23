---
title: "Cómo armar un fullstack Laravel con Inertia.js, React, TypeScript y Tailwind, paso a paso"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Laravel y PHP moderno
tags: [php, laravel, inertia, react, typescript, tailwind]
excerpt: "Una pantalla de check-in de asistencia: Laravel 13 entrega props con Inertia, React y TypeScript las renderizan, y las Policies de los artículos anteriores siguen mandando."
status: published
---

Hoy vamos a ver cómo armar un fullstack con Laravel, Inertia.js, React, TypeScript y Tailwind. Básicamente, Inertia evita que tengamos que inventar una API JSON solo para pintar una pantalla: el controlador devuelve una página React con *props*, y el navegador se siente como una SPA, sin montar un frontend suelto en otro puerto.

Este es el sexto tutorial de la serie **Laravel y PHP moderno**. Se apoya en las [Policies](/post/proteger-app-laravel-con-sanctum-policies-y-gates) y en las [relaciones de Eloquent](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1). Lo escribí el 23 de noviembre de 2026 contra **Laravel 13.43.0**. El frontend de este artículo es un ejemplo mínimo, archivo por archivo; no parte de un repositorio público. El reto está en [Desafíos](/challenges/pagina-inertia-de-check-in).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/fullstack-laravel-inertia-react-typescript-tailwind#que-vamos-a-construir)
2. [Prerrequisitos](/post/fullstack-laravel-inertia-react-typescript-tailwind#prerrequisitos)
3. [Instalación](/post/fullstack-laravel-inertia-react-typescript-tailwind#instalacion)
4. [Carpetas y responsabilidad](/post/fullstack-laravel-inertia-react-typescript-tailwind#carpetas)
5. [Paso a paso](/post/fullstack-laravel-inertia-react-typescript-tailwind#paso-a-paso)
6. [Cómo probarlo](/post/fullstack-laravel-inertia-react-typescript-tailwind#probarlo)
7. [Cómo agrego otra pantalla de punta a punta](/post/fullstack-laravel-inertia-react-typescript-tailwind#extender)
8. [Errores típicos y trampas](/post/fullstack-laravel-inertia-react-typescript-tailwind#errores)
9. [Checklist](/post/fullstack-laravel-inertia-react-typescript-tailwind#checklist)
10. [Resumen](/post/fullstack-laravel-inertia-react-typescript-tailwind#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Una página `/check-in` donde recepción o el sensei ven al grupo de hoy y marcan quién llegó. El controlador autoriza, carga el grupo con `with('estudiantes')` (sí, sin N+1) y devuelve `Inertia::render('CheckIn/Index', […])`. React recibe las *props* tipadas y manda un `POST` por Inertia, no por `fetch` suelto.

<a id="prerrequisitos"></a>

## Prerrequisitos

- El proyecto Laravel 13 de esta serie, con roles y `AsistenciaPolicy`.
- Node.js 20 o superior. Yo tengo **Node v24.22.1** y **npm 11.21.1** en la máquina donde escribo, pero para este artículo no hace falta esa versión exacta.
- PHP 8.3 o 8.4 y Composer 2.

```bash
php artisan -V
node -v
npm -v
```

<a id="instalacion"></a>

## Instalación

Laravel 13 ofrece *starter kits* oficiales (React, Vue, Livewire) cuando crean un proyecto nuevo. Si ustedes están empezando de cero y quieren Inertia + React + Tailwind ya cableados, ese es el camino más corto: un `laravel new` eligiendo el kit de React. Este artículo asume que **ya tienen** el dojo de los tutoriales anteriores y quieren agregar Inertia encima, sin tirar el proyecto.

El adaptador de servidor y el de React (nombres actuales, noviembre de 2026):

```bash
composer require inertiajs/inertia-laravel
php artisan inertia:middleware
npm install @inertiajs/react react react-dom
```

El middleware generado hay que registrarlo en el grupo `web` de `bootstrap/app.php`, como indica el propio comando al terminar. En Vite, el plugin de React y Tailwind se instalan con las recetas actuales de Laravel (`@vitejs/plugin-react` y el plugin de Tailwind que traiga su versión de `laravel-vite-plugin`). El punto delicado no es el nombre del paquete: es que `resources/js/app.tsx` monte Inertia y que cada página viva en `resources/js/Pages`.

Un `app.tsx` mínimo se ve así:

```tsx
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true });
    return pages[`./Pages/${name}.tsx`];
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
```

`resolve` convierte `'CheckIn/Index'` en `./Pages/CheckIn/Index.tsx`. Si el nombre no coincide, Inertia no encuentra la página y el error parece de Vite, no de Laravel.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
app/Http/Controllers/CheckInController.php
app/Http/Middleware/HandleInertiaRequests.php
resources/js/Pages/CheckIn/Index.tsx
resources/js/app.tsx
routes/web.php
```

- El controlador autoriza, consulta y arma *props*. No pinta HTML a mano.
- La página React pinta y envía formularios con `useForm` de Inertia.
- El middleware comparte datos globales (el usuario autenticado, el nombre de la app). No comparte listados enormes: eso va en la página que los necesita.

<a id="paso-a-paso"></a>

## Paso a paso

El controlador:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Asistencia;
use App\Models\Grupo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CheckInController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('create', Asistencia::class);

        $grupo = Grupo::query()
            ->with(['estudiantes' => fn ($query) => $query->orderBy('nombre')])
            ->findOrFail($request->integer('grupo') ?: Grupo::query()->value('id'));

        $fecha = now()->toDateString();
        $asistencias = Asistencia::query()
            ->where('fecha', $fecha)
            ->whereIn('estudiante_id', $grupo->estudiantes->pluck('id'))
            ->get()
            ->keyBy('estudiante_id');

        return Inertia::render('CheckIn/Index', [
            'grupo' => $grupo,
            'fecha' => $fecha,
            'asistencias' => $asistencias,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Asistencia::class);

        $datos = $request->validate([
            'estudiante_id' => ['required', 'exists:estudiantes,id'],
            'fecha' => ['required', 'date'],
            'presente' => ['required', 'boolean'],
        ]);

        Asistencia::query()->updateOrCreate(
            [
                'estudiante_id' => $datos['estudiante_id'],
                'fecha' => $datos['fecha'],
            ],
            ['presente' => $datos['presente']],
        );

        return back();
    }
}
```

`$this->authorize('create', Asistencia::class)` reutiliza la Policy: un estudiante no entra a esta pantalla. `updateOrCreate` respeta el índice único `(estudiante_id, fecha)` del [artículo de Eloquent](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1).

Las rutas web, detrás del middleware de sesión (no de `auth:sanctum`, que es para la API):

```php
Route::middleware('auth')->group(function () {
    Route::get('/check-in', [CheckInController::class, 'index']);
    Route::post('/check-in', [CheckInController::class, 'store']);
});
```

Y la página React, tipada. Inertia entrega las *props* como argumentos del componente:

```tsx
import { useForm } from '@inertiajs/react';

type Estudiante = { id: number; nombre: string; grado: string };
type Grupo = { id: number; nombre: string; horario: string; estudiantes: Estudiante[] };
type Asistencia = { id: number; estudiante_id: number; presente: boolean };

type Props = {
  grupo: Grupo;
  fecha: string;
  asistencias: Record<string, Asistencia>;
};

export default function Index({ grupo, fecha, asistencias }: Props) {
  const form = useForm({
    estudiante_id: 0,
    fecha,
    presente: true,
  });

  function marcar(estudianteId: number, presente: boolean) {
    form.transform(() => ({
      estudiante_id: estudianteId,
      fecha,
      presente,
    }));
    form.post('/check-in', { preserveScroll: true });
  }

  return (
    <section>
      <h1>Check-in · {grupo.nombre}</h1>
      <p>{grupo.horario} · {fecha}</p>
      <ul>
        {grupo.estudiantes.map((estudiante) => {
          const asistencia = asistencias[estudiante.id];
          return (
            <li key={estudiante.id}>
              <span>{estudiante.nombre} ({estudiante.grado})</span>
              <button type="button" onClick={() => marcar(estudiante.id, true)} disabled={form.processing}>
                Presente
              </button>
              <button type="button" onClick={() => marcar(estudiante.id, false)} disabled={form.processing}>
                Ausente
              </button>
              <small>{asistencia ? (asistencia.presente ? 'presente' : 'ausente') : 'sin marcar'}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

No llamo a `/api/asistencias` desde esta página. Inertia habla con las rutas `web`. Si más adelante una app móvil necesita la misma regla, esa sí usa la API con Sanctum, y ambas pasan por la misma Policy.

<a id="probarlo"></a>

## Cómo probarlo

En una terminal, el servidor de Laravel; en otra, Vite:

```bash
php artisan serve
npm run dev
```

Entran con un usuario de recepción o sensei (la sesión web de Laravel, no un token Bearer). Deben ver al grupo y poder marcar a alguien. Recargan: el estado sigue, porque se guardó en `asistencias`.

Con un usuario estudiante, la Policy responde 403. Eso se puede afirmar también con Pest:

```php
it('impide el check-in a un estudiante', function () {
    $usuario = User::factory()->create(['rol' => 'estudiante']);

    $this->actingAs($usuario)
        ->get('/check-in')
        ->assertForbidden();
});
```

<a id="extender"></a>

## Cómo agrego otra pantalla de punta a punta

Una lista de grupos:

1. `GrupoController@index` con `$this->authorize('viewAny', Grupo::class)` (si todavía no hay Policy de grupo, la crean con el mismo criterio de roles).
2. `Grupo::query()->withCount('estudiantes')->orderBy('nombre')->get()`.
3. `Inertia::render('Grupos/Index', ['grupos' => $grupos])`.
4. `resources/js/Pages/Grupos/Index.tsx` con las *props* tipadas y un enlace a `/check-in?grupo={id}`.
5. Un test de feature que afirme 200 para sensei y 403 para un estudiante.

<a id="errores"></a>

## Errores típicos y trampas

**El nombre de la página no coincide con el archivo.** `'CheckIn/Index'` pide `Pages/CheckIn/Index.tsx`. Una mayúscula de más y Vite no resuelve.

**Hacer `fetch('/api/...')` desde la página Inertia.** Funciona un rato, y después pelean dos mecanismos de autenticación (sesión vs token). Para esta pantalla, `useForm().post()` es el camino.

**Olvidar `with('estudiantes')` en el controlador.** Volvemos al N+1, ahora en la pantalla «bonita».

**Compartir el dojo entero en `HandleInertiaRequests`.** Ese middleware corre en todas las páginas. Ahí va el usuario, no la lista de 200 estudiantes.

**Pintar sin tipar las *props*.** TypeScript no adivina lo que mandó Laravel. El `type Props` es el contrato. Si el controlador cambia un nombre, el compilador debería quejarse.

**Dejar Tailwind o Vite mal cableados y culpar a Inertia.** Si la página en blanco no tiene un error de Inertia en la consola, miren primero `npm run dev` y la raíz `#app` del Blade.

<a id="checklist"></a>

## Checklist

- [ ] Inertia está instalado en el servidor y en React.
- [ ] `CheckInController` autoriza con la Policy y carga el grupo con `with('estudiantes')`.
- [ ] Existe `resources/js/Pages/CheckIn/Index.tsx` con *props* tipadas.
- [ ] Recepción puede marcar asistencia; un estudiante recibe 403.
- [ ] El estado sobrevive a una recarga.
- [ ] El reto está en [Desafíos](/challenges/pagina-inertia-de-check-in).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, Inertia nos deja un fullstack Laravel + React sin inventar una API solo para pintar. El controlador sigue siendo el lugar de la autorización y de la consulta; la página TypeScript pinta y envía el formulario. Las Policies de esta serie no se reescriben: se reutilizan.

El [último artículo de la ruta](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis) mira el despliegue con ojos de AWS, pero sin encender nada de pago: Sail, MinIO, Redis y, si quieren, LocalStack. El ejercicio de esta pantalla está en los [desafíos](/challenges/pagina-inertia-de-check-in).
