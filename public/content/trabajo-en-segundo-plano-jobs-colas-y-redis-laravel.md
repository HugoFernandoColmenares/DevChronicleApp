---
title: "Cómo poner trabajo en segundo plano con Jobs, colas y Redis en Laravel"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Laravel y PHP moderno
tags: [php, laravel, colas, redis, jobs]
excerpt: "Un Job de recordatorio de clase en Laravel 13: lo despacho a la cola database (que ya trae el esqueleto) y un worker lo procesa en 16.84 ms, con el camino claro hacia Redis."
status: published
---

Hoy vamos a ver cómo sacar de la petición HTTP el trabajo que puede esperar: un recordatorio de clase para un grupo del dojo. Básicamente, la petición deja un Job en una cola, y un *worker* lo procesa en otro momento. Si el correo o el reporte tarda dos segundos, el usuario no tiene por qué pagarlos en la misma respuesta.

Este es el cuarto tutorial de la serie **Laravel y PHP moderno**. Parte del [dojo de Eloquent](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1). Lo corrí el 23 de noviembre de 2026 en **Laravel Framework 13.43.0**. El esqueleto oficial ya trae la tabla `jobs` y, en mi `.env`, `QUEUE_CONNECTION=database`. Redis queda como el paso siguiente, el mismo que más tarde se parece a Amazon SQS, sin gastar nada todavía.

El reto está en [Desafíos](/challenges/job-recordatorio-de-clase), no en este artículo.

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#que-vamos-a-construir)
2. [Prerrequisitos](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#prerrequisitos)
3. [Instalación](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#instalacion)
4. [Carpetas y responsabilidad](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#carpetas)
5. [Paso a paso](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#paso-a-paso)
6. [Cómo probarlo](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#probarlo)
7. [Cómo agrego otro Job de punta a punta](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#extender)
8. [Errores típicos y trampas](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#errores)
9. [Checklist](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#checklist)
10. [Resumen](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Un Job `EnviarRecordatorioDeClase` que recibe el `id` de un grupo y una fecha, carga el grupo con `withCount('estudiantes')` y escribe un log. Lo despacho a la cola `database`. Un worker lo toma con `php artisan queue:work --once`.

En mi corrida, después de despachar, había **1 fila** en la tabla `jobs`. El worker lo corrió así:

```text
2026-11-23 14:44:44 App\Jobs\EnviarRecordatorioDeClase .. RUNNING
2026-11-23 14:44:44 App\Jobs\EnviarRecordatorioDeClase .. 16.84ms DONE
```

Y el log dejó esta línea (el grupo Infantil, que el seeder del artículo de Eloquent ya había creado):

```text
[2026-11-23 14:44:44] local.INFO: recordatorio-de-clase {"grupo":"Infantil","horario":"Sábado 10:00","estudiantes":8,"fecha":"2026-11-24"}
```

<a id="prerrequisitos"></a>

## Prerrequisitos

El proyecto Laravel 13 de los artículos anteriores, con al menos un `Grupo` en la base. PHP 8.3 o 8.4. Redis **no** hace falta para el primer recorrido: la conexión `database` usa la tabla `jobs` que ya migró `laravel new`.

```bash
php artisan -V
grep QUEUE_CONNECTION .env
```

En el esqueleto de Laravel 13.43.0, esa línea ya decía `QUEUE_CONNECTION=database`.

<a id="instalacion"></a>

## Instalación

No instalé un paquete nuevo para la cola de base de datos. El Job se crea con:

```bash
php artisan make:job EnviarRecordatorioDeClase
```

El comando me escribió `app/Jobs/EnviarRecordatorioDeClase.php`. En Laravel 13 el esqueleto implementa `ShouldQueue` y usa el *trait* `Queueable`. Ya no aparecen, uno debajo del otro, `Dispatchable`, `InteractsWithQueue` y `SerializesModels`: van dentro de `Queueable`. Si un tutorial viejo les pide pegar esos cuatro, no hace falta pelearse con el archivo nuevo.

Para Redis, más adelante:

```bash
composer require predis/predis
```

O la extensión `phpredis`. En `.env` cambiarían a `QUEUE_CONNECTION=redis` y levantarían Redis en local (Docker, o Laravel Sail, que veremos en el [artículo de AWS sin gastar](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis)). En esta entrega me quedo en `database` porque es lo que ya corre, y es gratis.

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
app/Jobs/EnviarRecordatorioDeClase.php
database/migrations/0001_01_01_000002_create_jobs_table.php
storage/logs/laravel.log
```

- El Job hace **una** cosa: armar el recordatorio de un grupo en una fecha. No pinta HTML.
- Quien lo despacha (un controlador, un comando, un *scheduler*) no envía el correo ahí mismo.
- La tabla `jobs` es el buzón cuando la conexión es `database`. La tabla `failed_jobs` guarda lo que reventó.

<a id="paso-a-paso"></a>

## Paso a paso

El Job queda así. Recibo identificadores, no el modelo entero: así el worker vuelve a leer el grupo cuando le toca, y no serializo un Eloquent que pudo haber cambiado.

```php
<?php

namespace App\Jobs;

use App\Models\Grupo;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class EnviarRecordatorioDeClase implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $grupoId, public string $fechaIso)
    {
        //
    }

    public function handle(): void
    {
        $grupo = Grupo::query()->withCount('estudiantes')->findOrFail($this->grupoId);

        Log::info('recordatorio-de-clase', [
            'grupo' => $grupo->nombre,
            'horario' => $grupo->horario,
            'estudiantes' => $grupo->estudiantes_count,
            'fecha' => $this->fechaIso,
        ]);
    }
}
```

En un producto, aquí iría una notificación o un mailable. Yo dejo un log para poder mostrar una salida real, sin montar un servidor de correo ni gastar en un proveedor.

Despacho el Job, por ejemplo desde Tinker o desde un controlador, después de autorizar:

```php
$grupo = Grupo::query()->first();
EnviarRecordatorioDeClase::dispatch($grupo->id, '2026-11-24');
```

`dispatch()` no corre `handle()` en ese momento, si la conexión no es `sync`. Deja una fila en `jobs`. Lo comprobé:

```php
echo 'jobs in table: '.DB::table('jobs')->count();
```

Eso imprimió `jobs in table: 1`.

El worker, en otra terminal (o en la misma, con `--once` para una sola toma):

```bash
php artisan queue:work --once
```

`--once` procesa un Job y se sale. Es ideal para este tutorial. En local, de día a día, dejan corriendo `php artisan queue:work` o, con Laravel, `composer dev` / el proceso que ya traiga el esqueleto. En producción no se deja `sync`: si lo hacen, el Job corre dentro de la petición y perdemos el sentido de la cola.

Para repetir un recordatorio todos los días, el *scheduler* de Laravel (en `routes/console.php`) puede despachar el Job a una hora fija. El *scheduler* necesita un cron que llame `php artisan schedule:run` cada minuto. Eso ya es el recorte siguiente; no lo corrí en esta entrega.

<a id="probarlo"></a>

## Cómo probarlo

1. Confirmen `QUEUE_CONNECTION=database` en `.env`.
2. Despachen el Job de un grupo que exista.
3. `php artisan queue:work --once` debe mostrar `RUNNING` y `DONE`, como en mi corrida de 16.84 ms.
4. En `storage/logs/laravel.log` debe aparecer el `recordatorio-de-clase` con el nombre del grupo.

Si quieren ver el fallo a propósito, pasen un `grupoId` que no exista. `findOrFail()` lanza, el Job va a `failed_jobs`, y el worker lo dice. Eso también es una prueba: el error no se traga en silencio.

En tests, Laravel deja la cola en `sync` (lo dice `phpunit.xml` del esqueleto: `QUEUE_CONNECTION=sync`). Para afirmar que se despachó, sin correr el envío de verdad, se usa `Queue::fake()` y `Queue::assertPushed(...)`. Eso lo vemos de cerca en el [artículo de Pest](/post/testear-laravel-con-pest-unitarias-feature-autorizacion).

<a id="extender"></a>

## Cómo agrego otro Job de punta a punta

Para un reporte de asistencia semanal:

1. `php artisan make:job GenerarReporteDeAsistencia`.
2. El constructor recibe un rango de fechas, no toda la colección de asistencias.
3. En `handle()`, una consulta con `with('estudiante.grupo')` (sí, eviten el N+1 también aquí) y un archivo CSV en el disco `local`, o un log si todavía no hay archivo.
4. Lo despacho desde un comando `php artisan dojo:reporte-semanal`.
5. Un test con `Queue::fake()` comprueba que el comando despacha el Job.

<a id="errores"></a>

## Errores típicos y trampas

**Dejar `QUEUE_CONNECTION=sync` en un servidor y creer que ya hay cola.** El Job corre en la misma petición. Si el correo se cae, se cae la respuesta.

**Correr `queue:work` y no ver nada porque olvidaron despachar, o despacharon en `sync`.** Revisen `.env` y `php artisan config:clear` si cambiaron la conexión después de un `config:cache`.

**Serializar el modelo Eloquent entero y después borrarlo.** El worker se queja de un modelo que ya no existe. Pasen el `id` y vuelvan a leer.

**Un Job que hace cinco cosas.** Cuando falla la quinta, las otras cuatro se reintentan. Un Job, una responsabilidad. El reporte y el recordatorio son dos clases.

**Poner Redis en producción sin haberlo visto en local.** Primero `database` en local, después Redis en Docker o Sail, y más adelante el mapeo a SQS en el [artículo de AWS](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis). No hace falta encender AWS para aprender colas.

**Olvidar el worker en producción.** La tabla `jobs` se llena y «el correo nunca sale». El síntoma no es un error 500. Es silencio. Un *healthcheck* del worker importa tanto como el de la web.

<a id="checklist"></a>

## Checklist

- [ ] `QUEUE_CONNECTION=database` en `.env` local.
- [ ] Existe `app/Jobs/EnviarRecordatorioDeClase.php` con `ShouldQueue` y `Queueable`.
- [ ] El constructor recibe `grupoId` y `fechaIso`, no el modelo completo.
- [ ] Después de `dispatch()`, hay una fila en `jobs`.
- [ ] `php artisan queue:work --once` lo procesa y el log muestra el recordatorio.
- [ ] El reto está en [Desafíos](/challenges/job-recordatorio-de-clase).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, un Job en Laravel 13 es una clase pequeña que implementa `ShouldQueue`. En el esqueleto oficial, la cola `database` ya está lista: despacho el recordatorio, el worker lo toma y el log confirma el grupo Infantil con 8 estudiantes. Redis (y más tarde SQS) es el mismo dibujo, con otro buzón.

El [siguiente artículo](/post/testear-laravel-con-pest-unitarias-feature-autorizacion) pone a prueba, con Pest, tanto la Policy del artículo anterior como este despacho. El ejercicio está en los [desafíos](/challenges/job-recordatorio-de-clase).
