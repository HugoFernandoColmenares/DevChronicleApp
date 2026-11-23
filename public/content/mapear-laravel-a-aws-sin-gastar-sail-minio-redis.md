---
title: "Cómo mapear Laravel a AWS sin gastar: Sail, MinIO, Redis y LocalStack"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Laravel y PHP moderno
tags: [php, laravel, aws, sail, minio, redis, localstack]
excerpt: "Una tabla de una página —Sail, Redis, MinIO y LocalStack frente a ECS, ElastiCache, S3 y SQS— y un upload local que dispara un Job, sin una sola llamada de pago."
status: published
---

Hoy vamos a ver cómo mapear una app Laravel a los servicios que suelen pedir en una vacante de AWS, **sin encender nada de pago**. Básicamente, aprendemos el dibujo: qué pieza local hace de prima de RDS, de S3, de SQS, de ElastiCache o de ECS, y recorremos un upload que dispara un Job. Si un día quieren el *free tier* de AWS, que sea una decisión consciente, no un paso de este tutorial.

Este es el séptimo y último artículo de la serie **Laravel y PHP moderno**. Se apoya en las [colas](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel). Lo escribí el 23 de noviembre de 2026 contra **Laravel 13.43.0**. No corrí LocalStack ni MinIO en esta bitácora: dejo los comandos exactos y un walkthrough reproducible en local, con la cola `database` que sí corrí de verdad en el artículo de Jobs. El reto está en [Desafíos](/challenges/tabla-de-mapeo-aws-y-upload-local).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#que-vamos-a-construir)
2. [Prerrequisitos](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#prerrequisitos)
3. [Instalación](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#instalacion)
4. [El cuadro de mapeo](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#mapeo)
5. [Paso a paso: disco S3, Job y worker](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#paso-a-paso)
6. [Cómo probarlo](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#probarlo)
7. [Cómo agrego otro archivo de punta a punta](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#extender)
8. [Errores típicos y trampas](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#errores)
9. [Checklist](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#checklist)
10. [Resumen](/post/mapear-laravel-a-aws-sin-gastar-sail-minio-redis#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Dos entregables. Primero, una tabla de una página: servicio local → servicio AWS → qué hace en la app. Segundo, un recorrido de upload: un archivo entra por un formulario, Laravel lo guarda en un disco compatible con S3 (MinIO en Docker, o el disco `local` si todavía no levantan MinIO), y un Job lo procesa en la cola. El test de storage no pega a la nube real.

<a id="prerrequisitos"></a>

## Prerrequisitos

- El proyecto Laravel 13 de esta serie, con al menos un Job y `QUEUE_CONNECTION=database` funcionando, como en el [artículo de colas](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel).
- Docker, si quieren Sail, MinIO o LocalStack. Si no tienen Docker hoy, igual pueden hacer el recorrido con el disco `local` y la cola `database`. No es menos válido: es el mismo código, con otro disco.
- Nada de una cuenta de AWS. En serio: no es un prerrequisito.

```bash
php artisan -V
docker --version   # solo si van a levantar MinIO o Sail
```

<a id="instalacion"></a>

## Instalación

Laravel Sail se instala, en un proyecto ya creado, con el script oficial. Lean el aviso: tira de Docker.

```bash
composer require laravel/sail --dev
php artisan sail:install
```

Elijan MySQL (o Postgres) y Redis cuando el instalador pregunte. Eso les deja `compose.yaml` (o `docker-compose.yml`, según la versión del instalador) y el comando `./vendor/bin/sail up -d`.

MinIO, en un servicio de Compose, es un S3 compatible. Un bloque típico, para pegar junto al de Sail, se ve así. Las claves son de **ejemplo local**, no de producción:

```yaml
minio:
  image: minio/minio
  ports:
    - "9000:9000"
    - "9001:9001"
  environment:
    MINIO_ROOT_USER: sail
    MINIO_ROOT_PASSWORD: password
  command: server /data --console-address ":9001"
  volumes:
    - minio-data:/data
```

En `.env`, el disco `s3` de Laravel apunta a ese MinIO, no a AWS:

```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=sail
AWS_SECRET_ACCESS_KEY=password
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=dojo-local
AWS_ENDPOINT=http://127.0.0.1:9000
AWS_USE_PATH_STYLE_ENDPOINT=true
```

`AWS_USE_PATH_STYLE_ENDPOINT=true` es el detalle que más gente se salta: MinIO (y LocalStack) suelen necesitar el estilo *path*, no el de subdominio de AWS. Crean el *bucket* `dojo-local` en la consola de MinIO (`http://127.0.0.1:9001`) o con el cliente `mc`.

LocalStack es opcional. Sirve si quieren ver el mismo API de S3 o SQS sin MinIO. No es obligatorio para este tutorial, y tampoco es «ya tengo producción».

El paquete de Flysystem para S3, si el proyecto no lo trae:

```bash
composer require league/flysystem-aws-s3-v3
```

Laravel lo usa tanto para AWS como para MinIO: el protocolo es el mismo.

<a id="mapeo"></a>

## El cuadro de mapeo

| En local (gratis) | En AWS (cuando alguien lo pague) | Qué hace en la app |
| --- | --- | --- |
| SQLite o MySQL/Postgres de Sail | RDS | Tablas de Eloquent: grupos, estudiantes, asistencias |
| Redis de Sail o de Docker | ElastiCache | Caché del horario semanal y, si cambian la cola, el buzón de Jobs |
| Tabla `jobs` o Redis | SQS | Recordatorios y reportes en segundo plano |
| MinIO (o disco `local`) | S3 | Archivos subidos: un CSV de asistencia, un afiche del dojo |
| `php artisan serve` + Vite, o un contenedor de Sail | ECS o EC2 (a veces Laravel Vapor) | La app en sí, el worker del `queue:work` |
| LocalStack (opcional) | Varios APIs de AWS a la vez | Practicar el SDK sin la cuenta de pago |

El código de la app **no** debería preguntar «¿estoy en AWS?». Pregunta por un disco (`Storage::disk(config('filesystems.default'))`) y por una cola (`QUEUE_CONNECTION`). Cambiar de MinIO a S3, o de `database` a `sqs`, es un cambio de `.env`, no de `if ($esAws)`.

<a id="paso-a-paso"></a>

## Paso a paso: disco S3, Job y worker

Un formulario web (o una ruta de API) recibe el archivo, lo guarda y despacha un Job. El controlador no procesa el CSV en la petición.

```php
public function store(Request $request): RedirectResponse
{
    $this->authorize('create', Asistencia::class);

    $datos = $request->validate([
        'archivo' => ['required', 'file', 'mimes:csv,txt', 'max:1024'],
    ]);

    $ruta = $request->file('archivo')->store('importaciones', config('filesystems.default'));

    ProcesarImportacionDeAsistencia::dispatch($ruta);

    return back()->with('ok', 'El archivo quedó en cola.');
}
```

El Job lee del mismo disco. Si el disco es MinIO, el objeto aparece en el *bucket*. Si todavía es `local`, aparece en `storage/app/private/importaciones` (o la ruta que Laravel 13 use para el disco por defecto). El Job no sabe la diferencia:

```php
public function handle(): void
{
    $contenido = Storage::disk(config('filesystems.default'))->get($this->ruta);
    Log::info('importacion-de-asistencia', [
        'ruta' => $this->ruta,
        'bytes' => strlen($contenido),
    ]);
}
```

Un *healthcheck* mínimo del worker, en local, es el mismo de siempre: `php artisan queue:work --once` debe dejar `DONE`, y el log, una línea. Los logs estructurados (como el `Log::info('recordatorio-de-clase', […])` que ya corrimos) se leen igual en CloudWatch el día de mañana.

GitHub Actions, en esta ruta, corre `vendor/bin/pest` y `npm run build`. No despliega a AWS. Un workflow que se «cuela» con secretos de una cuenta real es justo lo que queremos evitar.

<a id="probarlo"></a>

## Cómo probarlo

1. Armen la tabla de mapeo (es el reto de esta entrega, y también el entregable que pueden pegar en un README).
2. Suban un CSV chico por la ruta de importación, con el disco `local` o con MinIO.
3. Confirmen que el archivo está en el disco (carpeta `storage` o consola de MinIO en `:9001`).
4. `php artisan queue:work --once` procesa el Job.
5. Un test de storage usa el disco `fake`, no la nube:

```php
it('guarda la importacion en el disco falso', function () {
    Storage::fake('local');
    $usuario = User::factory()->create(['rol' => 'sensei']);
    $archivo = Illuminate\Http\UploadedFile::fake()->create('asistencias.csv', 20, 'text/csv');

    $this->actingAs($usuario)
        ->post('/importaciones', ['archivo' => $archivo])
        ->assertRedirect();

    Storage::disk('local')->assertExists('importaciones/'.$archivo->hashName());
});
```

`Storage::fake()` es la garantía de que el test no se va a un *bucket* real, ni siquiera a MinIO.

<a id="extender"></a>

## Cómo agrego otro archivo de punta a punta

Un afiche del dojo (una imagen SFW) usa la misma ruta: validar, `store()` en el disco por defecto, y, si hace falta un recorte, un Job. No copien un cliente de AWS en el controlador «por si acaso».

<a id="errores"></a>

## Errores típicos y trampas

**Subir credenciales de ejemplo a un repositorio y, más tarde, reemplazarlas por las reales en el mismo archivo.** El `.env` no se sube. Un `.env.example` lleva claves falsas, nunca las de una cuenta.

**Un `AWS_ENDPOINT` mal puesto.** MinIO en `localhost:9000` desde un contenedor de Sail no es `localhost`: es el nombre del servicio (`minio`) en la red de Compose. Desde el host, sí es `127.0.0.1`.

**Confundir «ya corrí LocalStack» con «ya tengo producción».** LocalStack es un simulacro. No tiene la cuota, ni el IAM, ni la factura de AWS. Sirve para practicar el API, no para afirmar que el sistema está en la nube.

**Costos silenciosos.** Un `QUEUE_CONNECTION=sqs` contra una cuenta real, un *bucket* sin política de ciclo de vida, o un `npm run` que se va a ECS, pueden generar cargo. Este tutorial no pide esa cuenta. Si un día la abren, pongan alarmas de facturación antes que el primer recurso.

**Probar el storage contra S3 de verdad en CI.** El test de arriba usa `Storage::fake()`. Si un test necesita red, no es un test de esta ruta.

<a id="checklist"></a>

## Checklist

- [ ] Tengo la tabla de mapeo local → AWS → uso en la app, en una página.
- [ ] El upload guarda en el disco de `FILESYSTEM_DISK`, no en una ruta a palo.
- [ ] Un Job procesa el archivo; la petición HTTP no lo parsea.
- [ ] El test de storage usa `Storage::fake()` y no pega a la nube.
- [ ] No hay claves reales de AWS en el repositorio.
- [ ] El reto está en [Desafíos](/challenges/tabla-de-mapeo-aws-y-upload-local).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, hablar de AWS en una vacante no obliga a encender AWS para aprender. Sail, Redis, MinIO y la cola `database` (la que ya vimos correr un Job en 16.84 ms) cubren el mismo dibujo que RDS, ElastiCache, S3, SQS y ECS. El truco es que la app hable de discos y de colas, no de nombres de marca.

Con este artículo cierra la ruta de Laravel y PHP moderno. El ejercicio, la tabla y el walkthrough del upload, están en los [desafíos](/challenges/tabla-de-mapeo-aws-y-upload-local).
