---
title: "Cómo modelar relaciones en Eloquent y cazar el problema N+1"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Laravel y PHP moderno
tags: [php, laravel, eloquent, sql, n-plus-1, sqlite]
excerpt: "Tres grupos de un dojo, 24 estudiantes y sus asistencias: modelo hasMany, belongsTo y belongsToMany en Laravel 13, y cómo el N+1 pasa de 28 consultas a 3 con eager loading."
status: published
---

Hoy vamos a ver cómo modelar relaciones de verdad en Eloquent y, sobre todo, cómo cazar el problema N+1. Si vienen de Entity Framework, esto les va a sonar: `hasMany` y `belongsTo` son el primo de las navegaciones, y `with()` es el `Include()` de toda la vida, con otra sintaxis.

Este es el segundo tutorial de la serie **Laravel y PHP moderno**. El [anterior](/post/php-8-3-tipado-moderno-tipos-enums-readonly) deja el piso de tipos en PHP 8.3+. Aquí ya entramos a Laravel. El código de este artículo lo corrí el 23 de noviembre de 2026 en **Laravel Framework 13.43.0** y **PHP 8.4.28**, con SQLite. No parte de un repositorio público: es un ejemplo mínimo, archivo por archivo, pensado para aplicarlo después en una mesa de dojo como Seiryuko Tatami.

El reto de esta entrega está en [Desafíos](/challenges/cazar-n-plus-1-en-asistencia-del-dojo), no al final de este texto.

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#que-vamos-a-construir)
2. [Prerrequisitos](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#prerrequisitos)
3. [Instalación](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#instalacion)
4. [Carpetas y responsabilidad](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#carpetas)
5. [Paso a paso: migraciones, relaciones y el N+1](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#paso-a-paso)
6. [Cómo probarlo](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#probarlo)
7. [Cómo agrego otra relación de punta a punta](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#extender)
8. [Errores típicos y trampas](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#errores)
9. [Checklist](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#checklist)
10. [Resumen](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Un rincón de un dojo en Laravel 13:

- un `Grupo` tiene muchos `Estudiante`;
- un `Estudiante` pertenece a un `Grupo`, tiene muchas `Asistencia` y muchas `Tecnica` (sí, *belongsToMany*);
- una consulta «lista de grupos con el nombre de cada estudiante y cuántas asistencias lleva» hecha de dos maneras: la que dispara el N+1, y la que no.

Con 3 grupos y 8 estudiantes por grupo (24 en total, 5 asistencias cada uno) medí esto:

- sin `with()`: **28 consultas**;
- con `Grupo::with('estudiantes.asistencias')->get()`: **3 consultas**.

Mismos 24 renglones. La diferencia es el `in (…)` de Eloquent, no una magia de la base.

El flujo es este:

1. `SELECT` de todos los grupos.
2. En el N+1, por cada grupo otro `SELECT` de estudiantes, y por cada estudiante otro de asistencias.
3. Con *eager loading*, un `SELECT` de estudiantes `where grupo_id in (1, 2, 3)` y un `SELECT` de asistencias `where estudiante_id in (1, 2, …, 24)`.

<a id="prerrequisitos"></a>

## Prerrequisitos

- PHP 8.3 o 8.4. Yo usé **8.4.28**.
- Composer 2. Yo usé **2.11.2**.
- La extensión PDO de SQLite (`php8.4-sqlite3` en Debian). Laravel 13, recién creado, ya corre las migraciones iniciales sobre `database/database.sqlite`.
- Haber leído el [tutorial de tipos](/post/php-8-3-tipado-moderno-tipos-enums-readonly) ayuda, pero no es obligatorio para seguir este.

Comprobaciones:

```bash
php -v
composer -V
php -m | grep -i pdo_sqlite
```

La última debe mostrar `pdo_sqlite`. Si no aparece, en Debian instalé `php8.4-sqlite3`.

<a id="instalacion"></a>

## Instalación

El 23 de noviembre de 2026, el esqueleto oficial instala Laravel 13. Yo lo creé así:

```bash
composer create-project --prefer-dist laravel/laravel tatami-demo "^13.0"
cd tatami-demo
php artisan -V
```

`php artisan -V` me respondió:

```text
Laravel Framework 13.43.0
```

El `composer.json` quedó con `"php": "^8.3"` y `"laravel/framework": "^13.17"`. Después de `create-project`, Laravel ya creó la base SQLite, corrió las migraciones de `users`, `cache` y `jobs`, y escribió la `APP_KEY`. No hace falta MySQL para este tutorial.

Los modelos los generé con el *artisan* de esta versión:

```bash
php artisan make:model Grupo -mf
php artisan make:model Estudiante -mf
php artisan make:model Asistencia -mf
php artisan make:model Tecnica -mf
```

La bandera `-m` crea la migración. La `-f` crea el *factory*. En Laravel 13.43.0 el modelo generado trae solo `HasFactory`; las relaciones las escribimos nosotros. El comando imprime, por ejemplo:

```text
INFO Model [app/Models/Grupo.php] created successfully.
INFO Factory [database/factories/GrupoFactory.php] created successfully.
INFO Migration [database/migrations/2026_11_23_144228_create_grupos_table.php] created successfully.
```

La fecha del nombre de la migración será la de ustedes, no la mía. Lo importante es el **orden**: primero `grupos`, luego `estudiantes` (que apunta a `grupos`), luego `asistencias`, y al final `tecnicas` con su tabla pivote.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
tatami-demo/
├── app/Models/
│   ├── Grupo.php
│   ├── Estudiante.php
│   ├── Asistencia.php
│   └── Tecnica.php
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/DojoSeeder.php
└── artisan
```

- Las migraciones describen las tablas y las claves foráneas. Ahí vive la forma de la base, no en el modelo.
- Los modelos declaran las relaciones y, si hace falta, los *casts* (`fecha` como fecha, `presente` como booleano).
- Los *factories* inventan datos de prueba. El seeder arma un dojo pequeño y repetible.
- No pongo consultas SQL sueltas en un controlador. Si la lista de grupos necesita estudiantes y asistencias, la consulta se expresa con `with()`.

<a id="paso-a-paso"></a>

## Paso a paso: migraciones, relaciones y el N+1

### Las migraciones

`grupos` es una tabla simple: nombre y horario.

```php
Schema::create('grupos', function (Blueprint $table) {
    $table->id();
    $table->string('nombre');
    $table->string('horario');
    $table->timestamps();
});
```

`estudiantes` apunta al grupo con `foreignId`. `constrained('grupos')` crea la clave foránea. `cascadeOnDelete()` borra a los estudiantes si se borra el grupo, que en un ejemplo local está bien y en producción se piensa dos veces.

```php
Schema::create('estudiantes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('grupo_id')->constrained('grupos')->cascadeOnDelete();
    $table->string('nombre');
    $table->string('grado', 8);
    $table->timestamps();
});
```

`asistencias` no puede repetir la misma fecha para el mismo estudiante: por eso el `unique(['estudiante_id', 'fecha'])`.

```php
Schema::create('asistencias', function (Blueprint $table) {
    $table->id();
    $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
    $table->date('fecha');
    $table->boolean('presente')->default(true);
    $table->timestamps();

    $table->unique(['estudiante_id', 'fecha']);
});
```

`tecnicas` va con una tabla pivote `estudiante_tecnica`. Eloquent, por convención, busca los nombres de los dos modelos en orden alfabético y un guion bajo. `Estudiante` y `Tecnica` producen `estudiante_tecnica`. Si le ponen otro nombre, hay que decirlo en `belongsToMany`.

```php
Schema::create('tecnicas', function (Blueprint $table) {
    $table->id();
    $table->string('nombre');
    $table->string('categoria');
    $table->timestamps();
});

Schema::create('estudiante_tecnica', function (Blueprint $table) {
    $table->id();
    $table->foreignId('estudiante_id')->constrained('estudiantes')->cascadeOnDelete();
    $table->foreignId('tecnica_id')->constrained('tecnicas')->cascadeOnDelete();
    $table->timestamps();

    $table->unique(['estudiante_id', 'tecnica_id']);
});
```

### Las relaciones

En `Grupo`, un `hasMany` hacia los estudiantes:

```php
public function estudiantes(): HasMany
{
    return $this->hasMany(Estudiante::class);
}
```

En `Estudiante`, el otro lado (`belongsTo`), las asistencias y las técnicas:

```php
public function grupo(): BelongsTo
{
    return $this->belongsTo(Grupo::class);
}

public function asistencias(): HasMany
{
    return $this->hasMany(Asistencia::class);
}

public function tecnicas(): BelongsToMany
{
    return $this->belongsToMany(Tecnica::class)->withTimestamps();
}
```

`withTimestamps()` en el pivote hace que Eloquent llene `created_at` y `updated_at` al hacer `attach()`. Si la tabla pivote no tiene esas columnas, esta llamada falla: o las agregan, o quitan el `withTimestamps()`.

`Asistencia` convierte la fecha y el booleano, para no trabajar con `'1'` y un string de fecha:

```php
protected function casts(): array
{
    return [
        'fecha' => 'date',
        'presente' => 'boolean',
    ];
}
```

### El seeder, para tener números de verdad

Tres grupos, ocho estudiantes cada uno, cinco asistencias por estudiante, y dos técnicas pegadas a cada quien. El seeder completo está en `database/seeders/DojoSeeder.php` del ejemplo; lo esencial es esto:

```php
Grupo::factory()
    ->count(3)
    ->sequence(
        ['nombre' => 'Infantil', 'horario' => 'Sábado 10:00'],
        ['nombre' => 'Juvenil', 'horario' => 'Lunes 18:00'],
        ['nombre' => 'Adultos', 'horario' => 'Miércoles 19:00'],
    )
    ->create()
    ->each(function (Grupo $grupo) use ($tecnicas): void {
        $estudiantes = Estudiante::factory()->count(8)->for($grupo)->create();

        $estudiantes->each(function (Estudiante $estudiante) use ($tecnicas): void {
            Asistencia::factory()
                ->count(5)
                ->for($estudiante)
                ->sequence(fn ($sequence) => [
                    'fecha' => now()->subDays($sequence->index)->toDateString(),
                ])
                ->create();

            $estudiante->tecnicas()->attach(
                $tecnicas->random(2)->pluck('id')->all(),
            );
        });
    });
```

Las fechas del *factory* de asistencia no pueden chocar con el índice único, por eso el `sequence` usa `subDays($sequence->index)` y no un `fake()->date()` suelto.

```bash
php artisan migrate
php artisan db:seed --class=DojoSeeder
```

En mi corrida, las cuatro migraciones nuevas terminaron en verde y el seeder tardó 183 ms.

### El N+1, medido

Este bucle se ve inofensivo: recorro grupos, de cada grupo sus estudiantes, de cada estudiante el recuento de asistencias.

```php
foreach (Grupo::all() as $grupo) {
    foreach ($grupo->estudiantes as $estudiante) {
        $linea = $grupo->nombre.' / '.$estudiante->nombre
            .' / asistencias: '.$estudiante->asistencias->count();
    }
}
```

Con `DB::enableQueryLog()` y `DB::getQueryLog()`, esa corrida sobre mis 24 estudiantes hizo **28 consultas**:

1. `select * from "grupos"`
2. tres veces `select * from "estudiantes" where "estudiantes"."grupo_id" = ?` (una por grupo);
3. veinticuatro veces `select * from "asistencias" where "asistencias"."estudiante_id" = ?` (una por estudiante).

Eso es el N+1: una consulta «padre» y después **una más por cada hijo**. Si el dojo crece a 200 estudiantes, esta lista se vuelve 200 consultas de más, en silencio.

La versión con *eager loading* pide las relaciones de una vez:

```php
foreach (Grupo::with('estudiantes.asistencias')->get() as $grupo) {
    foreach ($grupo->estudiantes as $estudiante) {
        $linea = $grupo->nombre.' / '.$estudiante->nombre
            .' / asistencias: '.$estudiante->asistencias->count();
    }
}
```

La misma lista, **3 consultas**:

```sql
select * from "grupos"
select * from "estudiantes" where "estudiantes"."grupo_id" in (1, 2, 3)
select * from "asistencias" where "asistencias"."estudiante_id" in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24)
```

El punto en `'estudiantes.asistencias'` es anidación: trae estudiantes y, de esos, sus asistencias. Si solo necesitan el recuento y no las filas, `withCount('asistencias')` es todavía más barato: agrega una subconsulta de `count` y no carga las 120 asistencias a memoria.

<a id="probarlo"></a>

## Cómo probarlo

Yo lo medí con un script que arranca la app, enciende el log de consultas y corre las dos versiones. Pueden pegarlo en `routes/console.php` como comando, o correrlo con `php -r` después de arrancar el *kernel*, como hice yo. Lo importante es ver el número:

```php
use App\Models\Grupo;
use Illuminate\Support\Facades\DB;

DB::flushQueryLog();
DB::enableQueryLog();

foreach (Grupo::all() as $grupo) {
    foreach ($grupo->estudiantes as $estudiante) {
        $estudiante->asistencias->count();
    }
}

echo 'consultas: '.count(DB::getQueryLog()).PHP_EOL;
```

En mi base sembrada, eso imprime `consultas: 28`. Cambien `Grupo::all()` por `Grupo::with('estudiantes.asistencias')->get()` y deben ver `consultas: 3`.

Laravel también puede **romper** el N+1 en lugar de dejarlo pasar. En `AppServiceProvider::boot()` (o solo cuando no están en producción):

```php
use Illuminate\Database\Eloquent\Model;

public function boot(): void
{
    Model::preventLazyLoading(! $this->app->isProduction());
}
```

Lo activé a propósito sobre `Grupo::all()` y, al tocar `$grupo->estudiantes`, Laravel lanzó:

```text
Illuminate\Database\LazyLoadingViolationException
Attempted to lazy load [estudiantes] on model [App\Models\Grupo] but lazy loading is disabled.
```

Ese mensaje es el que quiero ver en desarrollo. No es un fallo de la base. Es Eloquent diciendo: «esta relación no se pidió con `with()`». En producción no lo dejo encendido al principio, porque una vista vieja podría caerse; en local, sí.

Laravel Debugbar y Telescope sirven para ver lo mismo con interfaz, y los dos tienen capa gratuita para local. No los instalé en esta corrida: el log de consultas alcanzó para sacar los números. Si los instalan, recuerden no dejar Telescope abierto a todo el mundo en un servidor público.

<a id="extender"></a>

## Cómo agrego otra relación de punta a punta

Digamos que cada grupo tiene un `Sensei`. El recorrido es el mismo:

1. `php artisan make:model Sensei -mf`
2. Migración `senseis` (o `sensei`, si prefieren el nombre en singular; Eloquent pluraliza) y un `foreignId('sensei_id')->nullable()` en `grupos`.
3. `Grupo::sensei()` como `belongsTo` y `Sensei::grupos()` como `hasMany`.
4. Actualizo el seeder.
5. Donde liste grupos, cambio a `Grupo::with(['sensei', 'estudiantes.asistencias'])`.
6. Corro de nuevo el recuento de consultas: debería seguir siendo un número chico y estable, no uno que crezca con cada grupo.

<a id="errores"></a>

## Errores típicos y trampas

**Usar `count($estudiante->asistencias)` o `->count()` sobre la colección ya cargada está bien; llamar `$estudiante->asistencias()->count()` es otra consulta.** El primero cuenta en memoria. El segundo pega a la base aunque ya hayan hecho `with('asistencias')`. Si miden consultas y les aparece una de más por estudiante, fíjense en los paréntesis.

**El nombre de la tabla pivote.** Si la llaman `tecnica_estudiante` (al revés), `belongsToMany` no la encuentra. O respetan el orden alfabético, o lo pasan como segundo argumento.

**Olvidar el orden de las migraciones.** Si `estudiantes` se corre antes que `grupos`, la clave foránea falla. El nombre con fecha y hora no es decoración.

**Dejar `preventLazyLoading()` solo en un test y no en local.** El test pasa, la página de `/grupos` en el navegador sigue haciendo N+1. El proveedor de la app es el lugar honesto.

**Cargar de más.** `with('estudiantes.asistencias.estudiante.grupo')` puede traer un árbol enorme. Pidan solo lo que la vista necesita. `withCount()` cuando solo necesitan el número.

**Confiar en Debugbar en producción.** Es una herramienta de local. En un servidor público muestra consultas, y a veces más de lo que ustedes querrían mostrar.

<a id="checklist"></a>

## Checklist

- [ ] `php artisan -V` muestra Laravel 13.
- [ ] Las migraciones de `grupos`, `estudiantes`, `asistencias` y `tecnicas` corren en ese orden.
- [ ] Las relaciones `hasMany`, `belongsTo` y `belongsToMany` están escritas en los modelos, no solo en la cabeza.
- [ ] El seeder crea 3 grupos y 24 estudiantes.
- [ ] Sin `with()`, el log muestra decenas de consultas (28 en mi corrida).
- [ ] Con `with('estudiantes.asistencias')`, el log muestra 3.
- [ ] En local, `Model::preventLazyLoading()` está encendido y el N+1 se ve como una excepción, no como lentitud misteriosa.
- [ ] El reto de esta entrega está en [Desafíos](/challenges/cazar-n-plus-1-en-asistencia-del-dojo).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, Eloquent no es solo «el ORM de Laravel». Las relaciones se declaran en el modelo, y el N+1 se caza midiendo consultas, no adivinando. En un dojo de 24 estudiantes, la misma lista pasó de 28 consultas a 3 con un `with()` anidado. En uno de 200, la diferencia ya no es una curiosidad.

En el [siguiente artículo](/post/proteger-app-laravel-con-sanctum-policies-y-gates) esas mismas tablas se encuentran con la autorización: quién puede ver o marcar una asistencia. El ejercicio para la mano está en los [desafíos](/challenges/cazar-n-plus-1-en-asistencia-del-dojo).
