---
title: "Cómo proteger una app Laravel con Sanctum, Policies y Gates"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Laravel y PHP moderno
tags: [php, laravel, sanctum, autorizacion, policies, api]
excerpt: "Sanctum 4.5 en Laravel 13 para emitir tokens, y una Policy de asistencias con tres roles de dojo: sensei, recepción y estudiante, más un Gate para el reporte del día."
status: published
---

Hoy vamos a ver cómo proteger una app Laravel de verdad: autenticación con Laravel Sanctum y autorización con Policies y Gates. Básicamente, Sanctum responde «¿quién eres?», y la Policy responde «¿puedes hacer esto con esta asistencia?». No son lo mismo, y mezclarlos es el camino más corto a un agujero.

Este es el tercer tutorial de la serie **Laravel y PHP moderno**. Parte de las tablas de [Eloquent y el N+1](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1). Lo corrí el 23 de noviembre de 2026 en **Laravel Framework 13.43.0** y **laravel/sanctum 4.5.0**. El reto está en [Desafíos](/challenges/policy-de-asistencia-por-rol), no en este artículo.

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/proteger-app-laravel-con-sanctum-policies-y-gates#que-vamos-a-construir)
2. [Prerrequisitos](/post/proteger-app-laravel-con-sanctum-policies-y-gates#prerrequisitos)
3. [Instalación](/post/proteger-app-laravel-con-sanctum-policies-y-gates#instalacion)
4. [Carpetas y responsabilidad](/post/proteger-app-laravel-con-sanctum-policies-y-gates#carpetas)
5. [Paso a paso](/post/proteger-app-laravel-con-sanctum-policies-y-gates#paso-a-paso)
6. [Cómo probarlo](/post/proteger-app-laravel-con-sanctum-policies-y-gates#probarlo)
7. [Cómo agrego otra acción de punta a punta](/post/proteger-app-laravel-con-sanctum-policies-y-gates#extender)
8. [Errores típicos y trampas](/post/proteger-app-laravel-con-sanctum-policies-y-gates#errores)
9. [Checklist](/post/proteger-app-laravel-con-sanctum-policies-y-gates#checklist)
10. [Resumen](/post/proteger-app-laravel-con-sanctum-policies-y-gates#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Tres roles en el dojo — `sensei`, `recepcion` y `estudiante` — y estas reglas:

- el sensei ve y edita cualquier asistencia;
- recepción crea y ve las del día, pero no las borra;
- un estudiante solo ve las suyas;
- un Gate `ver-reporte-del-dia` queda reservado a sensei y recepción.

Y una ruta API `/api/user` protegida con `auth:sanctum`, que es la que deja instalada Laravel 13.

<a id="prerrequisitos"></a>

## Prerrequisitos

El proyecto del artículo anterior, con las tablas de grupos, estudiantes y asistencias. PHP 8.3 o 8.4, Composer 2, Laravel 13. Comprueben:

```bash
php artisan -V
composer show laravel/framework | head -2
```

<a id="instalacion"></a>

## Instalación

En Laravel 13 el camino oficial no es «buscar el paquete a mano y adivinar el middleware». Es este comando:

```bash
php artisan install:api --without-migration-prompt
```

`--without-migration-prompt` evita la pregunta interactiva de «¿corro las migraciones?». El comando instala Laravel Sanctum si hace falta, publica `routes/api.php` y registra esa ruta en `bootstrap/app.php`. En mi corrida, Sanctum ya estaba en **4.5.0**, y el comando terminó así:

```text
INFO Published API routes file.
INFO API scaffolding installed. Please add the [Laravel\Sanctum\HasApiTokens] trait to your User model.
```

Ese aviso no es decoración. Sin el *trait*, no pueden emitir tokens. Después, si la migración de `personal_access_tokens` quedó pendiente:

```bash
php artisan migrate
php artisan make:policy AsistenciaPolicy --model=Asistencia
```

El segundo comando me creó `app/Policies/AsistenciaPolicy.php`. En Laravel 13 el esqueleto devuelve `false` en todos los métodos. Es un buen valor por defecto: si se me olvida implementar uno, la respuesta es «no», no «sí».

<a id="carpetas"></a>

## Carpetas y responsabilidad

```text
app/Models/User.php
app/Policies/AsistenciaPolicy.php
app/Providers/AppServiceProvider.php
routes/api.php
bootstrap/app.php
```

- `User` autentica y declara el rol. No decide si una asistencia se puede editar.
- `AsistenciaPolicy` decide, caso por caso, con el usuario y el modelo.
- Un Gate, en el proveedor, cubre acciones que no cuelgan de un modelo concreto (el reporte del día).
- `routes/api.php` solo pone el middleware. La regla de negocio no vive en la ruta.

<a id="paso-a-paso"></a>

## Paso a paso

### El trait en User y un campo de rol

Agrego `HasApiTokens` y un `rol` simple. En un producto más grande usaría una tabla de roles; para aprender, un string validado alcanza.

```php
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'rol'])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public function esSensei(): bool
    {
        return $this->rol === 'sensei';
    }

    public function esRecepcion(): bool
    {
        return $this->rol === 'recepcion';
    }
}
```

La migración del campo, en una migración nueva:

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('rol', 32)->default('estudiante');
});
```

`install:api` ya dejó esta ruta:

```php
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
```

Y en `bootstrap/app.php` aparece `api: __DIR__.'/../routes/api.php'`. Sin esa línea, `/api/user` no existe.

### La Policy

Laravel 13 descubre las policies por convención (`Asistencia` → `AsistenciaPolicy`). No hace falta registrarlas a mano. Reemplazo los `return false` de ver, crear, actualizar y borrar:

```php
public function viewAny(User $user): bool
{
    return $user->esSensei() || $user->esRecepcion();
}

public function view(User $user, Asistencia $asistencia): bool
{
    if ($user->esSensei() || $user->esRecepcion()) {
        return true;
    }

    return $asistencia->estudiante?->nombre !== null
        && $user->email !== null
        && $this->esDueño($user, $asistencia);
}

public function create(User $user): bool
{
    return $user->esSensei() || $user->esRecepcion();
}

public function update(User $user, Asistencia $asistencia): bool
{
    return $user->esSensei() || $user->esRecepcion();
}

public function delete(User $user, Asistencia $asistencia): bool
{
    return $user->esSensei();
}
```

Para «es dueño» lo honesto es relacionar `User` con `Estudiante`. En este ejemplo mínimo agrego un `estudiante_id` nullable en `users`, o comparo por un campo que ustedes ya tengan. Lo que no hago es dejar que un estudiante edite su propia asistencia: el check-in lo marca recepción o el sensei.

Una versión clara de `view` para el estudiante, cuando `User` tiene `estudiante_id`:

```php
public function view(User $user, Asistencia $asistencia): bool
{
    if ($user->esSensei() || $user->esRecepcion()) {
        return true;
    }

    return $user->estudiante_id !== null
        && $user->estudiante_id === $asistencia->estudiante_id;
}
```

### El Gate del reporte

En `AppServiceProvider::boot()`:

```php
use App\Models\User;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::define('ver-reporte-del-dia', function (User $user): bool {
        return $user->esSensei() || $user->esRecepcion();
    });
}
```

¿Por qué un Gate y no un método de la Policy? Porque el reporte no es «esta asistencia». Es una acción de la aplicación. Si mañana el reporte cuelga de un modelo `Reporte`, lo paso a una Policy. Hoy, un Gate se lee mejor.

### El controlador

```php
public function index(Request $request)
{
    $this->authorize('viewAny', Asistencia::class);

    return Asistencia::query()
        ->with('estudiante')
        ->latest('fecha')
        ->paginate(20);
}

public function show(Request $request, Asistencia $asistencia)
{
    $this->authorize('view', $asistencia);

    return $asistencia->load('estudiante');
}

public function reporteDelDia(Request $request)
{
    $this->authorize('ver-reporte-del-dia');

    return Asistencia::query()
        ->whereDate('fecha', now()->toDateString())
        ->with('estudiante')
        ->get();
}
```

`$this->authorize('view', $asistencia)` lanza `AuthorizationException` (HTTP 403) si la Policy dice no. No pongo `if ($request->user()->rol === 'sensei')` en el controlador: esa frase se copia, se olvida y se desincroniza.

Las rutas API quedan así:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
    Route::get('/asistencias', [AsistenciaController::class, 'index']);
    Route::get('/asistencias/{asistencia}', [AsistenciaController::class, 'show']);
    Route::get('/reportes/dia', [AsistenciaController::class, 'reporteDelDia']);
});
```

<a id="probarlo"></a>

## Cómo probarlo

Primero, un token de un usuario sensei (en Tinker o en un seeder de desarrollo):

```php
$user = User::factory()->create(['rol' => 'sensei']);
$token = $user->createToken('demo-local')->plainTextToken;
```

Luego, con curl, contra `php artisan serve`:

```bash
curl -sS http://127.0.0.1:8000/api/user \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

Si el token es válido, responde el usuario en JSON. Si lo omiten o lo inventan, Sanctum responde 401. Eso es autenticación. La autorización se ve en `/api/asistencias`: un usuario con rol `estudiante` debe recibir 403 en el índice y 200 solo en una asistencia suya.

En el [tutorial de Pest](/post/testear-laravel-con-pest-unitarias-feature-autorizacion) escribimos esto como test, que es el lugar correcto. Aquí, curl alcanza para ver el 401 y el 403 con los ojos.

<a id="extender"></a>

## Cómo agrego otra acción de punta a punta

Para «justificar una inasistencia»:

1. Agrego el método `justify` en `AsistenciaPolicy` (solo sensei, por ejemplo).
2. Un método `justify` en el controlador con `$this->authorize('justify', $asistencia)`.
3. Una ruta `POST /api/asistencias/{asistencia}/justificar` dentro del grupo `auth:sanctum`.
4. Una prueba que confirme 403 para recepción y 200 para sensei.

No agrego un `if` suelto en la ruta.

<a id="errores"></a>

## Errores típicos y trampas

**Olvidar `HasApiTokens`.** `createToken()` no existe y el mensaje parece un error de clase, no de instalación. Es el aviso que dejó `install:api`.

**Dejar los `return false` del esqueleto y pensar que «ya hay policy».** Hay archivo. No hay permiso. Todo da 403, incluido el sensei.

**Poner la regla en el controlador y en la Policy.** Un día cambian una y no la otra. La Policy es la fuente.

**Usar `Gate::define` para `update` de un modelo.** Eso es trabajo de Policy. El Gate queda para acciones sin un modelo claro.

**Exponer tokens en logs o en el chat.** `plainTextToken` se muestra una vez. Si se filtra, se revoca con `$user->tokens()->delete()` y se emite otro. Nunca lo suban a un repositorio.

**Olvidar `Accept: application/json` en curl.** Laravel puede devolver una redirección HTML al login, y parece que «la API no funciona».

<a id="checklist"></a>

## Checklist

- [ ] `php artisan install:api` publicó `routes/api.php`.
- [ ] `User` usa `HasApiTokens` y tiene un `rol`.
- [ ] `AsistenciaPolicy` implementa `view`, `create`, `update` y `delete` con las reglas del dojo.
- [ ] El Gate `ver-reporte-del-dia` está en el proveedor.
- [ ] Las rutas van detrás de `auth:sanctum`.
- [ ] Sin token: 401. Estudiante en el índice: 403. Sensei: 200.
- [ ] El reto está en [Desafíos](/challenges/policy-de-asistencia-por-rol).

<a id="resumen"></a>

## Resumen

Como acabamos de ver, Sanctum identifica a la persona, y la Policy decide qué puede hacer con una asistencia concreta. Un Gate cubre el reporte del día, que no cuelga de un solo modelo. En Laravel 13 el arranque oficial es `php artisan install:api`, y el esqueleto de la Policy empieza en `false` a propósito.

El [siguiente artículo](/post/trabajo-en-segundo-plano-jobs-colas-y-redis-laravel) saca el trabajo lento —un recordatorio de clase— de la petición HTTP y lo pone en una cola. El ejercicio está en los [desafíos](/challenges/policy-de-asistencia-por-rol).
