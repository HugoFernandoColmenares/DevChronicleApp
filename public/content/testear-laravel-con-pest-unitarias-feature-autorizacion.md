---
title: "Cómo testear de verdad con Pest: unitarias, de feature y el primer test de autorización"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Laravel y PHP moderno
tags: [php, laravel, pest, tests, autorizacion]
excerpt: "Pest 4.7.8 sobre Laravel 13 y PHPUnit 12: tres tests de la Policy de asistencias, 7 aserciones en verde, y por qué esta versión encaja con el esqueleto oficial."
status: published
---

Hoy vamos a ver cómo testear de verdad con Pest en Laravel 13: una prueba unitaria de espíritu (¿puede este usuario hacer esto?), dos de feature sobre la Policy de asistencias, y el hábito de no dejar la autorización «para probarla a mano». Básicamente, si la regla está en la Policy, el test habla con `can()`, no con un navegador.

Este es el quinto tutorial de la serie **Laravel y PHP moderno**. Parte de la [Policy de Sanctum](/post/proteger-app-laravel-con-sanctum-policies-y-gates). Lo corrí el 23 de noviembre de 2026 con **Pest 4.7.8**, **pestphp/pest-plugin-laravel 4.1.0**, **Laravel Framework 13.43.0** y **PHP 8.4.28**. El reto está en [Desafíos](/challenges/primer-test-de-autorizacion-pest).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#que-vamos-a-construir)
2. [Prerrequisitos](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#prerrequisitos)
3. [Instalación](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#instalacion)
4. [Carpetas y responsabilidad](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#carpetas)
5. [Paso a paso](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#paso-a-paso)
6. [Cómo probarlo](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#probarlo)
7. [Cómo agrego otro test de punta a punta](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#extender)
8. [Errores típicos y trampas](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#errores)
9. [Checklist](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#checklist)
10. [Resumen](/post/testear-laravel-con-pest-unitarias-feature-autorizacion#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Tres tests en `tests/Feature/AsistenciaPolicyTest.php`:

- el sensei puede ver y borrar cualquier asistencia;
- recepción puede crear y **no** puede borrar;
- un estudiante ve solo la suya, y no puede listar todas.

En mi corrida:

```text
{"tool":"pest","result":"passed","tests":3,"passed":3,"assertions":7,"duration_ms":187}
```

Tres tests, siete aserciones, 187 ms, todos en verde. Esas cifras salen de correr Pest, no de inventarlas.

<a id="prerrequisitos"></a>

## Prerrequisitos

El proyecto Laravel 13 con `AsistenciaPolicy`, el campo `rol` en `users` y los *factories* de `Grupo`, `Estudiante` y `Asistencia`. PHP 8.3 o 8.4.

<a id="instalacion"></a>

## Instalación

El esqueleto de Laravel 13.43.0 llega con **PHPUnit 12**, no con Pest. Pest 5, que es la versión más nueva al escribir esto, pide PHPUnit 13 y PHP 8.4. Si lo instalan tal cual sobre el esqueleto, Composer se queja: el `composer.json` raíz pide `phpunit/phpunit: ^12.5.12`. Por eso instalé **Pest 4**, que sigue recibiendo correcciones hasta julio de 2027 y encaja con PHP 8.3+ y PHPUnit 12:

```bash
composer require pestphp/pest:^4.1 pestphp/pest-plugin-laravel:^4.0 --dev --with-all-dependencies
vendor/bin/pest --version
```

La versión que me quedó fue **4.7.8**. En Laravel 13 no aparece un comando `pest:install`. El archivo que falta, y que hay que crear a mano, es `tests/Pest.php`. Sin él, los tests escritos con `it()` no arrancan la aplicación y fallan con un error opaco (`connection() on null`).

```php
<?php

pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');
```

Eso hace dos cosas. Primera: los tests de `tests/Feature` usan el `TestCase` de Laravel. Segunda: cada test corre sobre una base SQLite en memoria (`phpunit.xml` ya trae `DB_CONNECTION=sqlite` y `DB_DATABASE=:memory:`) y la reconstruye con `RefreshDatabase`. El seeder que usamos en local **no** corre aquí: cada test crea lo que necesita con *factories*. Es lo que queremos. Un test que depende de «lo que había en mi laptop» no se puede repetir.

Si más adelante quieren Pest 5, el camino honesto es subir PHPUnit a 13 (Laravel 13 lo acepta) y pedir `pestphp/pest:^5.0`. No es el camino del esqueleto recién creado.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
tests/Pest.php
tests/TestCase.php
tests/Feature/AsistenciaPolicyTest.php
tests/Feature/ExampleTest.php
phpunit.xml
```

- `Pest.php` configura Pest. No escribe reglas de negocio.
- El test de la Policy no abre el navegador. Habla con `$user->can()`.
- Un test HTTP (feature de verdad, con `$this->getJson`) viene después, cuando la ruta ya existe. Hoy estamos probando la regla, no el cableado.

<a id="paso-a-paso"></a>

## Paso a paso

Pest se lee casi en español. `it('…', function () { … })` es un caso. `expect(…)->toBeTrue()` es la aserción. Encadeno con `->and()` para no repetir el sujeto cuando hace falta, o dejo tres `expect` seguidos si se leen mejor.

```php
<?php

use App\Models\Asistencia;
use App\Models\Estudiante;
use App\Models\Grupo;
use App\Models\User;

it('permite al sensei ver cualquier asistencia', function () {
    $grupo = Grupo::factory()->create();
    $estudiante = Estudiante::factory()->for($grupo)->create();
    $asistencia = Asistencia::factory()->for($estudiante)->create([
        'fecha' => '2026-11-23',
    ]);
    $sensei = User::factory()->create(['rol' => 'sensei']);

    expect($sensei->can('view', $asistencia))->toBeTrue()
        ->and($sensei->can('delete', $asistencia))->toBeTrue();
});

it('permite a recepcion crear y le impide borrar', function () {
    $recepcion = User::factory()->create(['rol' => 'recepcion']);
    $grupo = Grupo::factory()->create();
    $estudiante = Estudiante::factory()->for($grupo)->create();
    $asistencia = Asistencia::factory()->for($estudiante)->create([
        'fecha' => '2026-11-22',
    ]);

    expect($recepcion->can('create', Asistencia::class))->toBeTrue()
        ->and($recepcion->can('delete', $asistencia))->toBeFalse();
});

it('permite al estudiante ver solo la suya', function () {
    $grupo = Grupo::factory()->create();
    $propio = Estudiante::factory()->for($grupo)->create();
    $ajeno = Estudiante::factory()->for($grupo)->create();
    $asistenciaPropia = Asistencia::factory()->for($propio)->create(['fecha' => '2026-11-21']);
    $asistenciaAjena = Asistencia::factory()->for($ajeno)->create(['fecha' => '2026-11-21']);
    $usuario = User::factory()->create([
        'rol' => 'estudiante',
        'estudiante_id' => $propio->id,
    ]);

    expect($usuario->can('view', $asistenciaPropia))->toBeTrue()
        ->and($usuario->can('view', $asistenciaAjena))->toBeFalse()
        ->and($usuario->can('viewAny', Asistencia::class))->toBeFalse();
});
```

Fíjense en tres detalles. Primero: cada test crea su `Grupo`. No llamo `Grupo::firstOrFail()` sobre datos de un seeder, porque `RefreshDatabase` parte de cero. Segundo: las fechas son distintas cuando hace falta respetar el índice único `(estudiante_id, fecha)`. Tercero: `$user->can('delete', $asistencia)` es el mismo verbo que `$this->authorize('delete', $asistencia)` en el controlador. Si el test está verde y la ruta da 403, el problema está en el cableado (middleware, token), no en la regla.

Una prueba unitaria, en `tests/Unit`, serviría para un value object (la `FechaExamen` del [primer artículo](/post/php-8-3-tipado-moderno-tipos-enums-readonly)) sin arrancar Laravel. Aquí la Policy necesita el contenedor y la base, así que vive en `Feature`.

<a id="probarlo"></a>

## Cómo probarlo

```bash
vendor/bin/pest tests/Feature/AsistenciaPolicyTest.php
```

O, equivalente en Laravel:

```bash
php artisan test tests/Feature/AsistenciaPolicyTest.php
```

La salida compacta de Pest, en mi corrida, fue la del inicio: 3 tests, 7 aserciones, 187 ms, `passed`. Si cambian la Policy y dejan que recepción borre, el segundo test se pone rojo. Eso es exactamente lo que queremos: el test documenta la regla.

Para un test HTTP, cuando la ruta exista:

```php
it('responde 403 cuando un estudiante pide el índice', function () {
    $usuario = User::factory()->create(['rol' => 'estudiante']);

    $this->actingAs($usuario, 'sanctum')
        ->getJson('/api/asistencias')
        ->assertForbidden();
});
```

Ese ya es un test de feature del cableado. Lo dejo como extensión, no como lo que corrí hoy.

<a id="extender"></a>

## Cómo agrego otro test de punta a punta

Para el Job del [artículo anterior](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel):

```php
use App\Jobs\EnviarRecordatorioDeClase;
use Illuminate\Support\Facades\Queue;

it('despacha el recordatorio de clase', function () {
    Queue::fake();
    $grupo = Grupo::factory()->create();

    EnviarRecordatorioDeClase::dispatch($grupo->id, '2026-11-24');

    Queue::assertPushed(EnviarRecordatorioDeClase::class, function ($job) use ($grupo) {
        return $job->grupoId === $grupo->id && $job->fechaIso === '2026-11-24';
    });
});
```

`Queue::fake()` evita que el worker corra de verdad. Estamos probando que se despachó, no que el log se escribió.

<a id="errores"></a>

## Errores típicos y trampas

**No crear `tests/Pest.php`.** Los `it()` se ejecutan sin Laravel. El error parece de Eloquent, no de Pest.

**Usar datos del seeder local.** En CI no están. `RefreshDatabase` + *factories*, siempre.

**Probar solo el caso feliz.** El test valioso de autorización es el 403: recepción no borra, el estudiante no ve la asistencia ajena.

**Instalar Pest 5 sin subir PHPUnit.** Composer lo dice claro: Pest 5 pide PHPUnit 13. No es un fallo de Laravel; es una restricción de Pest 5.

**Dejar `ExampleTest` y pensar que «ya hay cobertura».** El ejemplo del esqueleto solo pide `/` y un `true === true`. No cubre el dojo.

**Un test que dispara 28 consultas.** Sí: el N+1 también se ve en tests. `DB::enableQueryLog()` o `preventLazyLoading()` en `AppServiceProvider` cuando no es producción.

<a id="checklist"></a>

## Checklist

- [ ] `vendor/bin/pest --version` muestra 4.7.x (o la 5, si subieron PHPUnit a 13 a propósito).
- [ ] Existe `tests/Pest.php` con `TestCase` y `RefreshDatabase` en `Feature`.
- [ ] Los tres tests de `AsistenciaPolicyTest` están en verde (7 aserciones, en mi corrida).
- [ ] Cada test crea su propio grupo y sus estudiantes.
- [ ] Hay al menos un caso negativo (403 / `toBeFalse()`).
- [ ] El reto está en [Desafíos](/challenges/primer-test-de-autorizacion-pest).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, Pest se instala sobre el Laravel 13 oficial en su versión 4, porque esa es la que convive con PHPUnit 12. Con un `tests/Pest.php` bien puesto y tres casos sobre la Policy, la autorización deja de ser una ocurrencia de última hora. Siete aserciones en 187 ms alcanzan para dormir más tranquilos.

El [siguiente artículo](/post/fullstack-laravel-inertia-react-typescript-tailwind) arma la pantalla: Inertia, React, TypeScript y Tailwind, hablando con estas mismas policies. El ejercicio está en los [desafíos](/challenges/primer-test-de-autorizacion-pest).
