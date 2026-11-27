---
title: "Crear base API: el diseño común (DDD, DI, JWT y correo)"
author: Hugo Colmenares
date: 2026-11-25
series: Crear base API
tags: [crear-base-api, arquitectura, ddd, jwt, api]
excerpt: El contrato, las capas y las piezas compartidas de una API base con registro, login, refresh tokens y correos, que luego armo en ocho stacks.
---

Cada vez que empiezo un proyecto nuevo me pasa lo mismo: lo primero que necesito es registrar usuarios, dejarlos entrar y mandarles un correo. Y cada vez lo vuelvo a escribir desde cero, con pequeñas diferencias que después me cuestan horas. En esta serie vamos a ver cómo armar, de una vez por todas, una **API base** que sirva de punto de partida para cualquier proyecto.

Esta primera entrega no tiene un lenguaje en particular. Aquí dejo el diseño que comparten todas las demás: el contrato HTTP, la base de datos, las capas, la inyección de dependencias, cómo manejo los tokens y cómo envío correos. Después repito exactamente lo mismo en ocho stacks, para que puedan compararlos lado a lado:

1. [Node.js + TypeScript con Express](/post/crear-base-api-node-express)
2. [NestJS](/post/crear-base-api-nestjs)
3. [.NET 10 con Entity Framework Core](/post/crear-base-api-dotnet)
4. [Spring Boot con Spring Security](/post/crear-base-api-spring-boot)
5. [PHP con Laravel](/post/crear-base-api-laravel)
6. [Rust con Axum y SQLx](/post/crear-base-api-rust-axum)
7. [Python con FastAPI](/post/crear-base-api-fastapi)
8. [Go con la librería estándar](/post/crear-base-api-go)

Una aclaración honesta antes de empezar. El código de esta serie lo escribí para estos artículos y lo probé el 25 de noviembre de 2026 contra un Postgres y un Mailpit reales, con el mismo script de pruebas para los ocho stacks. Todavía no está en un repositorio público. La entrega de .NET parte de mi repo [BaseApiNetCore10](https://github.com/FeithNoir/BaseApiNetCore10) y explica en qué se aleja de él.

<a id="contenido"></a>

## Contenido

1. [Prerrequisitos](/post/crear-base-api-introduccion#prerrequisitos)
2. [Qué estoy construyendo](/post/crear-base-api-introduccion#que-estoy-construyendo)
3. [Las capas: DDD sin ceremonia](/post/crear-base-api-introduccion#capas)
4. [Inyección de dependencias y puertos](/post/crear-base-api-introduccion#di)
5. [El contrato HTTP](/post/crear-base-api-introduccion#contrato)
6. [Tokens: access, refresh y de un solo uso](/post/crear-base-api-introduccion#tokens)
7. [Contraseñas](/post/crear-base-api-introduccion#contrasenas)
8. [Correos: una interfaz y Mailpit](/post/crear-base-api-introduccion#correos)
9. [Errores con Problem Details](/post/crear-base-api-introduccion#errores)
10. [La base de datos](/post/crear-base-api-introduccion#base-de-datos)
11. [Docker Compose y variables de entorno](/post/crear-base-api-introduccion#docker)
12. [El contrato en OpenAPI](/post/crear-base-api-introduccion#openapi)
13. [La prueba de contrato: e2e.sh](/post/crear-base-api-introduccion#e2e)
14. [Cómo se ve cada pieza en cada stack](/post/crear-base-api-introduccion#equivalencias)
15. [SOLID, DRY y KISS en el diseño](/post/crear-base-api-introduccion#solid)
16. [Cómo agrego otro endpoint a todos los stacks](/post/crear-base-api-introduccion#extender)
17. [Errores típicos y trampas compartidas](/post/crear-base-api-introduccion#errores-tipicos)
18. [Dónde el diseño no es perfecto](/post/crear-base-api-introduccion#diferencias)
19. [Checklist](/post/crear-base-api-introduccion#checklist)
20. [Resumen](/post/crear-base-api-introduccion#resumen)
21. [Reto](/post/crear-base-api-introduccion#reto)

<a id="prerrequisitos"></a>

## Prerrequisitos

Para esta entrega no necesitan ningún lenguaje instalado. Necesitan lo que usan todas las demás:

- **Docker** con Compose, para levantar Postgres y Mailpit sin instalarlos.
- **curl** y **jq**, para el script de pruebas. `jq` es un procesador de JSON de línea de comandos.
- Un editor de texto.

Compruebo las versiones así:

```bash
docker --version
docker compose version
curl --version | head -1
jq --version
```

Si no tienen Docker, también sirve un Postgres y un Mailpit instalados a mano. Yo mismo probé la serie con Postgres 17 instalado en la máquina y el binario de Mailpit, porque en esa máquina no había Docker. Lo único que cambia es cómo se arrancan.

<a id="que-estoy-construyendo"></a>

## Qué estoy construyendo

Básicamente, una API de autenticación completa y reutilizable. Tiene registro con verificación por correo, login, refresh tokens con rotación, logout, cambio de contraseña, recuperación de contraseña y un endpoint para saber quién soy. Todo eso sobre una arquitectura por capas con inyección de dependencias, migraciones, pruebas, documentación OpenAPI y un `docker-compose.yml` para el entorno local.

¿Por qué hacerlo ocho veces? Porque en mis proyectos he usado todos estos stacks, y quiero una base igual en cada uno. Así, si un día salto de NestJS a Go, la API se comporta igual y el frontend ni se entera.

Este es el flujo completo de una cuenta, de punta a punta:

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant M as Mailpit (SMTP)
    C->>A: POST /register
    A->>M: correo de bienvenida con token
    C->>A: POST /verify-email {token}
    C->>A: POST /login
    A-->>C: accessToken (15 min) + refreshToken (7 días)
    C->>A: GET /me (Bearer accessToken)
    C->>A: POST /refresh {refreshToken}
    A-->>C: par nuevo, el viejo queda revocado
    C->>A: POST /forgot-password
    A->>M: correo con enlace de restablecer
    C->>A: POST /reset-password {token, newPassword}
    A->>M: aviso de contraseña cambiada
```

<a id="capas"></a>

## Las capas: DDD sin ceremonia

DDD (Domain-Driven Design, diseño guiado por el dominio) es una forma de organizar el código alrededor del negocio, no alrededor del framework. De todo lo que propone DDD, aquí uso lo que de verdad me ahorra problemas en una API de este tamaño: separar el código en cuatro capas y que las dependencias apunten siempre hacia adentro.

| Capa | Qué tiene | Qué NO puede conocer |
|---|---|---|
| **Domain** | Entidades (`User`), value objects (`Email`), errores de negocio y **puertos** (interfaces) | El framework, la base de datos, HTTP |
| **Application** | Casos de uso (`AuthService`) y DTOs | Cómo se guardan los datos o cómo se envía un correo |
| **Infrastructure** | Adaptadores: repositorios con SQL u ORM, hash, JWT, SMTP, plantillas, configuración | HTTP |
| **API** | Rutas o controladores, validación de entrada, traducción de errores a HTTP | Detalles de la base de datos |

Un **value object** es un objeto que se define por su valor y no por un id. `Email` es el ejemplo: dos correos con el mismo texto son el mismo correo. En la serie, `Email` siempre se guarda en minúsculas y sin espacios. Así, `Ana@Correo.com ` y `ana@correo.com` no crean dos cuentas.

La regla de oro es esta: el dominio no importa nada de afuera. Si mañana cambio Postgres por otra cosa, o SMTP por una API de correo, solo cambia Infrastructure. Y el caso de uso se prueba con dobles en memoria, sin levantar nada.

¿Esto es Clean Architecture o hexagonal? Un poco de las dos. Los puertos son la idea central de la arquitectura hexagonal; las capas concéntricas, de Clean Architecture. No me caso con el nombre. Me importa que el `AuthService` se lea igual en los ocho lenguajes.

<a id="di"></a>

## Inyección de dependencias y puertos

DI (dependency injection, inyección de dependencias) significa que una clase no crea lo que necesita: lo recibe desde afuera, normalmente por el constructor. El `AuthService` necesita guardar usuarios, hashear claves, firmar tokens y enviar correos. Pero no hace `new PostgresRepository()` ni `new SmtpClient()`. Recibe interfaces.

Esas interfaces son los **puertos**. Estos son los mismos en todos los stacks (cambia la sintaxis, no la idea):

| Puerto | Responsabilidad |
|---|---|
| `UserRepository` | Buscar por correo o id, insertar y actualizar usuarios |
| `RefreshTokenRepository` | Guardar, buscar por hash, revocar uno o todos los de un usuario |
| `OneTimeTokenRepository` | Tokens de verificación y de restablecer: guardar, buscar uno válido, marcarlo como usado |
| `PasswordHasher` | `hash(plain)` y `verify(plain, hash)` |
| `AccessTokenIssuer` | Firmar el JWT de acceso |
| `OpaqueTokens` | Generar un token aleatorio y devolver el valor y su hash |
| `EmailSender` | Enviar un `EmailMessage {to, subject, html, text}` |
| `EmailRenderer` | Convertir una plantilla y unos datos en un `EmailMessage` (opcional, ver abajo) |
| `Clock` | Decir qué hora es (para que las pruebas controlen el tiempo) |

Cada stack tiene un único **composition root**: el lugar donde se decide qué implementación recibe cada puerto. En NestJS es el módulo, en .NET son los `AddApplication()` y `AddInfrastructure()`, en Spring es una clase `@Configuration`, en Laravel es un service provider, y en Go, Rust y Express es un `main` o un `container` escrito a mano. Ver ese lugar en cada lenguaje es, para mí, la mejor forma de entender qué hace realmente un contenedor de DI.

<a id="contrato"></a>

## El contrato HTTP

Todas las rutas de auth cuelgan de `/api/v1/auth`. Además hay un `GET /health` que responde `{"status":"ok"}`.

| Método y ruta | Cuerpo | Éxito | Errores |
|---|---|---|---|
| `POST /register` | `{email, password, name}` | **201** `UserResponse` | 400 datos inválidos, 409 correo repetido |
| `POST /verify-email` | `{token}` | **204** | 400 token inválido, vencido o ya usado |
| `POST /login` | `{email, password}` | **200** `TokenPair` | 401 credenciales, 403 correo sin verificar |
| `POST /refresh` | `{refreshToken}` | **200** `TokenPair` (rota el token) | 400 token inválido o reusado |
| `POST /logout` | `{refreshToken}` | **204** (idempotente) | 400 si falta el campo |
| `POST /change-password` 🔒 | `{currentPassword, newPassword}` | **204** | 400 clave actual mala, 401 sin token |
| `POST /forgot-password` | `{email}` | **202** siempre | 400 si el correo no tiene forma válida |
| `POST /reset-password` | `{token, newPassword}` | **204** | 400 token inválido |
| `GET /me` 🔒 | — | **200** `UserResponse` | 401 sin token |

El candado 🔒 indica que la ruta exige `Authorization: Bearer <accessToken>`.

Las respuestas de éxito son estas:

```json
// UserResponse
{ "id": "0193...", "email": "ana@correo.com", "name": "Ana", "emailVerified": false, "createdAt": "2026-11-25T20:00:00Z" }

// TokenPair
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9...", "refreshToken": "q8V1...", "tokenType": "Bearer", "expiresIn": 900 }
```

Hay tres decisiones del contrato que conviene explicar, porque no son obvias:

1. **`forgot-password` responde 202 aunque el correo no exista.** Si respondiera 404, cualquiera podría averiguar qué correos tienen cuenta. A eso se le llama *user enumeration* (enumeración de usuarios).
2. **`change-password` con la clave actual mala responde 400, no 401.** El token es válido; lo que está mal es un dato del formulario. Si respondiera 401, muchos frontends cerrarían la sesión.
3. **`login` usa el mismo 401 si el correo no existe o si la clave es incorrecta.** Otra vez para no regalar información.

<a id="tokens"></a>

## Tokens: access, refresh y de un solo uso

Aquí está el corazón de la seguridad de la API, así que vamos con calma.

**El access token es un JWT.** Un JWT (JSON Web Token) es un texto firmado con tres partes: cabecera, datos (*claims*) y firma. El servidor lo puede validar sin ir a la base de datos. Lo firmo con **HS256** (HMAC con SHA-256), que usa un secreto compartido de al menos 32 caracteres. Dura **15 minutos** y lleva estos claims:

| Claim | Valor |
|---|---|
| `sub` | id del usuario |
| `email` | correo |
| `iss` | `baseapi` (quién lo emite) |
| `aud` | `baseapi-clients` (para quién es) |
| `iat` / `exp` | cuándo se emitió y cuándo vence |

En todos los stacks fijo la lista de algoritmos aceptados en `HS256`. Así un token con `"alg": "none"` (sin firma) se rechaza siempre. Es un ataque viejo, pero sigue apareciendo.

**El refresh token es opaco.** Opaco quiere decir que no lleva datos adentro: son 32 bytes aleatorios en base64url. Dura **7 días**. ¿Por qué no otro JWT? Porque un refresh tiene que poder revocarse, y para eso de todas formas hay que guardarlo. En la base **guardo solo su hash SHA-256**, nunca el valor. Si alguien se roba la tabla, no puede usar esos tokens.

**La rotación** funciona así: cada vez que el cliente usa un refresh, lo revoco y le entrego uno nuevo. ¿Y si alguien vuelve a usar uno ya revocado? Eso solo pasa si dos personas tienen el mismo token, o sea, si se lo robaron. En ese caso revoco **todos** los refresh tokens del usuario y respondo 400. Al ladrón y al dueño se les cierra la sesión, y el dueño vuelve a entrar con su clave.

**Los tokens de un solo uso** sirven para los enlaces de los correos. Se generan igual que el refresh (aleatorios, solo el hash en la base) y tienen un propósito:

| Propósito | Vence en | Qué pasa al usarlo |
|---|---|---|
| `verify_email` | 24 horas | Marca el correo como verificado |
| `reset_password` | 30 minutos | Cambia la clave, verifica el correo y revoca todas las sesiones |

Un token usado queda marcado con `used_at` y no sirve una segunda vez.

<a id="contrasenas"></a>

## Contraseñas

La regla del contrato es simple: **entre 8 y 72 caracteres**. ¿Por qué 72? Porque bcrypt, uno de los algoritmos de hash más usados, ignora todo lo que pase de 72 bytes. Con ese límite, cualquier stack puede usar bcrypt sin sorpresas.

Cada stack usa lo que su ecosistema recomienda, siempre con sal aleatoria:

| Stack | Algoritmo | Librería |
|---|---|---|
| Express, NestJS | Argon2id | `argon2` |
| .NET | PBKDF2-HMAC-SHA512 | `PasswordHasher<T>` de ASP.NET Core Identity |
| Spring Boot | bcrypt (costo 12) | `BCryptPasswordEncoder` |
| Laravel | Argon2id | `Hash` de Laravel con `HASH_DRIVER=argon2id` |
| Rust | Argon2id | `argon2` |
| FastAPI | Argon2id | `pwdlib[argon2]` |
| Go | bcrypt (costo 12) | `golang.org/x/crypto/bcrypt` |

Argon2id ganó la Password Hashing Competition y es la opción por defecto que recomienda OWASP. bcrypt sigue siendo aceptable. Ninguno se puede "deshashear": para comprobar una clave se vuelve a calcular el hash y se compara.

<a id="correos"></a>

## Correos: una interfaz y Mailpit

El caso de uso nunca habla con SMTP. Arma un `EmailMessage` y se lo pasa a `EmailSender`. Para armarlo hay dos variantes en la serie, y las dos son válidas:

- **Con motor de plantillas** (NestJS, .NET, Spring, Laravel, FastAPI): las plantillas son archivos (`.hbs`, `.html`, Blade, Thymeleaf, Jinja2) y un adaptador `EmailRenderer` las llena. Es lo cómodo cuando alguien que no programa quiere cambiar el diseño.
- **Con funciones** (Express, Rust, Go): las plantillas son funciones pequeñas en la capa de aplicación que devuelven el mensaje. Cero dependencias y el compilador revisa los datos.

Hay tres plantillas, cada una en HTML y en texto plano:

| Plantilla | Cuándo sale | Datos |
|---|---|---|
| `welcome-verify` | Al registrarse | `name`, `link` |
| `reset-password` | Al pedir restablecer | `name`, `link` |
| `notification` | Al cambiar o restablecer la clave | `name`, `message` |

Los enlaces apuntan al **frontend**, no a la API: `APP_URL/verify-email?token=...` y `APP_URL/reset-password?token=...`. El frontend lee el token de la URL y llama al endpoint. En todas las plantillas el nombre del usuario se escapa en HTML, porque es un dato que escribe el usuario y podría traer etiquetas.

Para desarrollo uso **Mailpit**, un servidor SMTP falso con bandeja web. Todo correo que la API envía al puerto 1025 aparece en `http://localhost:8025`, y nunca sale a internet. Además tiene una API REST, que el script de pruebas usa para leer los tokens de los correos.

En producción solo cambian `SMTP_HOST`, `SMTP_PORT` y, si hace falta, usuario y clave. El código no se toca.

<a id="errores"></a>

## Errores con Problem Details

Todos los errores salen con el formato **Problem Details** (RFC 9457), con `Content-Type: application/problem+json`. Es un estándar para que todos los errores de una API tengan la misma forma:

```json
{
  "type": "about:blank",
  "title": "Datos inválidos",
  "status": 400,
  "detail": "Revisa los campos marcados",
  "errors": { "email": ["formato inválido"], "password": ["debe tener entre 8 y 72 caracteres"] }
}
```

El campo `errors` es opcional y aparece en los errores de validación. Los errores de negocio se traducen siempre igual:

| Error de dominio | HTTP | Título |
|---|---|---|
| Validación | 400 | Datos inválidos |
| Token inválido | 400 | Token inválido |
| Correo repetido | 409 | Conflicto |
| Credenciales o sin token | 401 | No autorizado |
| Correo sin verificar | 403 | Correo sin verificar |
| Cualquier otra cosa | 500 | Error interno (sin detalles hacia afuera) |

<a id="base-de-datos"></a>

## La base de datos

Son tres tablas, iguales en todos los stacks. Cada uno las crea con su herramienta de migraciones (Drizzle Kit, TypeORM, EF Core, Flyway, Laravel, SQLx, Alembic, goose), pero el resultado en Postgres es este:

```sql
CREATE TABLE users (
    id                UUID PRIMARY KEY,
    email             VARCHAR(254) NOT NULL UNIQUE,
    name              VARCHAR(100) NOT NULL,
    password_hash     TEXT NOT NULL,
    email_verified_at TIMESTAMPTZ NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  CHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE one_time_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     VARCHAR(20) NOT NULL,
    token_hash  CHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_one_time_tokens_user ON one_time_tokens(user_id, purpose);
```

Uso `uuid` como clave en vez de un número autoincremental, para no revelar cuántos usuarios hay y para poder generar el id en el código antes de guardar. Los `ON DELETE CASCADE` hacen que, si borro un usuario, se vayan con él sus tokens.

<a id="docker"></a>

## Docker Compose y variables de entorno

Este `docker-compose.yml` levanta Postgres 18 y Mailpit:

```yaml
services:
  db:
    image: postgres:18
    environment:
      POSTGRES_USER: baseapi
      POSTGRES_PASSWORD: baseapi
      POSTGRES_DB: baseapi
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U baseapi -d baseapi"]
      interval: 5s
      timeout: 3s
      retries: 10

  mail:
    image: axllent/mailpit:v1.34
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # bandeja web
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: 1
      MP_SMTP_AUTH_ALLOW_INSECURE: 1

volumes:
  pgdata:
```

Dos detalles. El volumen se monta en `/var/lib/postgresql` y no en `/var/lib/postgresql/data`, porque la imagen de Postgres 18 cambió esa ruta. Y fijo Mailpit en `v1.34` para que la serie no cambie sola el día que salga otra versión.

Lo levanto y compruebo que los dos servicios están arriba:

```bash
docker compose up -d
docker compose ps
```

Todos los stacks leen las mismas variables de entorno. Este es el `.env.example`:

```bash
PORT=8080
DATABASE_URL=postgres://baseapi:baseapi@localhost:5432/baseapi
JWT_SECRET=cambia-esto-por-un-secreto-de-al-menos-32-caracteres
JWT_ISSUER=baseapi
JWT_AUDIENCE=baseapi-clients
JWT_ACCESS_TTL_MINUTES=15
REFRESH_TTL_DAYS=7
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM="Base API <no-reply@baseapi.local>"
APP_URL=http://localhost:4200
```

Tres cosas que aprendí a la mala mientras armaba la serie:

- `SMTP_FROM` va entre comillas. Sin ellas, `source .env` en bash falla por los símbolos `<` y `>`.
- `SMTP_HOST` es `127.0.0.1` y no `localhost`. En algunas máquinas `localhost` resuelve primero a IPv6 (`::1`) y Mailpit escucha en IPv4; Nodemailer, por ejemplo, se queda esperando un saludo que nunca llega.
- `JWT_SECRET` debe tener al menos 32 caracteres. Todos los stacks se niegan a arrancar si es más corto. Prefiero que falle al iniciar y no en la primera petición.

Para generar un secreto decente:

```bash
openssl rand -base64 48
```

<a id="openapi"></a>

## El contrato en OpenAPI

OpenAPI es un formato estándar para describir una API: rutas, cuerpos, respuestas y seguridad. Escribí el contrato a mano antes de programar, y cada stack expone su propia documentación en `/docs` (Laravel la deja en `/docs/api`). Este es el archivo completo, por si quieren importarlo en Postman o Insomnia:

```yaml
openapi: 3.1.0
info:
  title: Base API
  version: 1.0.0
  description: Contrato común de la serie «Crear base API» (DevChronicle).
servers:
  - url: http://localhost:8080
tags:
  - name: auth
paths:
  /health:
    get:
      summary: Estado del servicio
      responses:
        "200": { description: OK, content: { application/json: { schema: { type: object, properties: { status: { type: string, example: ok } } } } } }
  /api/v1/auth/register:
    post:
      tags: [auth]
      summary: Crea la cuenta y envía el correo de bienvenida con el enlace de verificación
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/RegisterRequest" } } } }
      responses:
        "201": { description: Cuenta creada, content: { application/json: { schema: { $ref: "#/components/schemas/UserResponse" } } } }
        "400": { $ref: "#/components/responses/Problem" }
        "409": { $ref: "#/components/responses/Problem" }
  /api/v1/auth/verify-email:
    post:
      tags: [auth]
      summary: Confirma el correo con el token que llegó por email
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/TokenRequest" } } } }
      responses:
        "204": { description: Correo verificado }
        "400": { $ref: "#/components/responses/Problem" }
  /api/v1/auth/login:
    post:
      tags: [auth]
      summary: Devuelve access token (JWT) y refresh token
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/LoginRequest" } } } }
      responses:
        "200": { description: Sesión iniciada, content: { application/json: { schema: { $ref: "#/components/schemas/TokenPairResponse" } } } }
        "400": { $ref: "#/components/responses/Problem" }
        "401": { $ref: "#/components/responses/Problem" }
        "403": { $ref: "#/components/responses/Problem" }
  /api/v1/auth/refresh:
    post:
      tags: [auth]
      summary: Rota el refresh token y entrega un par nuevo
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/RefreshRequest" } } } }
      responses:
        "200": { description: Par nuevo, content: { application/json: { schema: { $ref: "#/components/schemas/TokenPairResponse" } } } }
        "400": { $ref: "#/components/responses/Problem" }
  /api/v1/auth/logout:
    post:
      tags: [auth]
      summary: Revoca el refresh token (idempotente)
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/RefreshRequest" } } } }
      responses:
        "204": { description: Sesión cerrada }
  /api/v1/auth/change-password:
    post:
      tags: [auth]
      summary: Cambia la contraseña, cierra todas las sesiones y avisa por correo
      security: [{ bearer: [] }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/ChangePasswordRequest" } } } }
      responses:
        "204": { description: Contraseña cambiada }
        "400": { $ref: "#/components/responses/Problem" }
        "401": { $ref: "#/components/responses/Problem" }
  /api/v1/auth/forgot-password:
    post:
      tags: [auth]
      summary: Envía el enlace para restablecer (responde 202 aunque el correo no exista)
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/EmailRequest" } } } }
      responses:
        "202": { description: Si el correo existe, llegará un enlace }
        "400": { $ref: "#/components/responses/Problem" }
  /api/v1/auth/reset-password:
    post:
      tags: [auth]
      summary: Pone una contraseña nueva con el token del correo
      requestBody: { required: true, content: { application/json: { schema: { $ref: "#/components/schemas/ResetPasswordRequest" } } } }
      responses:
        "204": { description: Contraseña restablecida }
        "400": { $ref: "#/components/responses/Problem" }
  /api/v1/auth/me:
    get:
      tags: [auth]
      summary: Datos del usuario autenticado
      security: [{ bearer: [] }]
      responses:
        "200": { description: Usuario, content: { application/json: { schema: { $ref: "#/components/schemas/UserResponse" } } } }
        "401": { $ref: "#/components/responses/Problem" }
components:
  securitySchemes:
    bearer: { type: http, scheme: bearer, bearerFormat: JWT }
  responses:
    Problem:
      description: Error en formato Problem Details (RFC 9457)
      content: { application/problem+json: { schema: { $ref: "#/components/schemas/Problem" } } }
  schemas:
    RegisterRequest:
      type: object
      required: [email, password, name]
      properties:
        email: { type: string, format: email, maxLength: 254, example: ana@correo.com }
        password: { type: string, minLength: 8, maxLength: 72, example: secreta123 }
        name: { type: string, minLength: 2, maxLength: 100, example: Ana }
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string }
    RefreshRequest:
      type: object
      required: [refreshToken]
      properties: { refreshToken: { type: string } }
    TokenRequest:
      type: object
      required: [token]
      properties: { token: { type: string } }
    EmailRequest:
      type: object
      required: [email]
      properties: { email: { type: string, format: email } }
    ChangePasswordRequest:
      type: object
      required: [currentPassword, newPassword]
      properties:
        currentPassword: { type: string }
        newPassword: { type: string, minLength: 8, maxLength: 72 }
    ResetPasswordRequest:
      type: object
      required: [token, newPassword]
      properties:
        token: { type: string }
        newPassword: { type: string, minLength: 8, maxLength: 72 }
    TokenPairResponse:
      type: object
      properties:
        accessToken: { type: string }
        refreshToken: { type: string }
        tokenType: { type: string, example: Bearer }
        expiresIn: { type: integer, example: 900, description: Segundos de vida del access token }
    UserResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        name: { type: string }
        emailVerified: { type: boolean }
        createdAt: { type: string, format: date-time }
    Problem:
      type: object
      required: [type, title, status, detail]
      properties:
        type: { type: string, example: about:blank }
        title: { type: string, example: Datos inválidos }
        status: { type: integer, example: 400 }
        detail: { type: string, example: "password: debe tener entre 8 y 72 caracteres" }
        errors:
          type: object
          description: Opcional. Campo → lista de mensajes.
          additionalProperties: { type: array, items: { type: string } }
```

<a id="e2e"></a>

## La prueba de contrato: e2e.sh

Esta es la pieza que más me gusta de la serie. Un solo script en bash recorre el contrato completo contra cualquier stack: registra a una usuaria, lee el correo en Mailpit, verifica, hace login, rota tokens, prueba el reuso, cambia la clave, la restablece y cierra sesión. Son 28 comprobaciones. Si un stack pasa este script, cumple el contrato. Los ocho lo pasan.

```bash
#!/usr/bin/env bash
# Prueba de contrato de la serie «Crear base API».
# Corre el mismo recorrido contra cualquier stack: ./e2e.sh http://localhost:8080
# Necesita curl, jq y Mailpit escuchando en http://localhost:8025.
set -euo pipefail
API=${1:-http://localhost:8080}
MAIL=${MAILPIT:-http://localhost:8025}
EMAIL="ana.$(date +%s)@correo.com"
PASS="secreta123"
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✘\033[0m %s\n' "$1"; exit 1; }
expect() { [ "$1" = "$2" ] && ok "$3 ($1)" || fail "$3: esperaba $2 y llegó $1"; }

# status <método> <ruta> <json> [token]  -> imprime el código y deja el cuerpo en /tmp/e2e-body
status() {
  local auth=()
  [ -n "${4:-}" ] && auth=(-H "Authorization: Bearer $4")
  curl -s -o /tmp/e2e-body -w '%{http_code}' -X "$1" "$API$2" \
    -H 'Content-Type: application/json' "${auth[@]}" ${3:+-d "$3"}
}

# Saca el token del último correo que recibió $EMAIL con el asunto dado.
token_from_mail() {
  sleep 1
  local id
  id=$(curl -s "$MAIL/api/v1/search?query=to:$EMAIL%20subject:\"$1\"" | jq -r '.messages[0].ID')
  curl -s "$MAIL/api/v1/message/$id" | jq -r '.Text' | grep -o 'token=[A-Za-z0-9_-]*' | head -1 | cut -d= -f2
}

echo "Contrato contra $API"
expect "$(status GET /health)" 200 "health"
expect "$(status POST /api/v1/auth/register "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Ana\"}")" 201 "registro"
expect "$(status POST /api/v1/auth/register "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Ana\"}")" 409 "registro duplicado"
expect "$(status POST /api/v1/auth/register '{"email":"malo","password":"123","name":""}')" 400 "registro inválido"
grep -q '"status"' /tmp/e2e-body && ok "el error trae Problem Details" || fail "el 400 no es Problem Details"
expect "$(status POST /api/v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")" 403 "login sin verificar"

VERIFY=$(token_from_mail "confirma")
[ -n "$VERIFY" ] && ok "llegó el correo de bienvenida" || fail "no llegó el correo de bienvenida"
expect "$(status POST /api/v1/auth/verify-email "{\"token\":\"$VERIFY\"}")" 204 "verificar correo"
expect "$(status POST /api/v1/auth/verify-email "{\"token\":\"$VERIFY\"}")" 400 "token de verificación reusado"

expect "$(status POST /api/v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"mala-clave\"}")" 401 "login con clave mala"
expect "$(status POST /api/v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")" 200 "login"
ACCESS=$(jq -r .accessToken /tmp/e2e-body); REFRESH=$(jq -r .refreshToken /tmp/e2e-body)

expect "$(status GET /api/v1/auth/me '' "$ACCESS")" 200 "me con token"
[ "$(jq -r .email /tmp/e2e-body)" = "$EMAIL" ] && ok "me devuelve el correo" || fail "me no devolvió el correo"
expect "$(status GET /api/v1/auth/me)" 401 "me sin token"

expect "$(status POST /api/v1/auth/refresh "{\"refreshToken\":\"$REFRESH\"}")" 200 "refresh"
NEW_REFRESH=$(jq -r .refreshToken /tmp/e2e-body)
expect "$(status POST /api/v1/auth/refresh "{\"refreshToken\":\"$REFRESH\"}")" 400 "refresh reusado"
expect "$(status POST /api/v1/auth/refresh "{\"refreshToken\":\"$NEW_REFRESH\"}")" 400 "reuso cerró la familia"

expect "$(status POST /api/v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")" 200 "login de nuevo"
ACCESS=$(jq -r .accessToken /tmp/e2e-body); REFRESH=$(jq -r .refreshToken /tmp/e2e-body)
expect "$(status POST /api/v1/auth/change-password '{"currentPassword":"mala","newPassword":"otraClave456"}' "$ACCESS")" 400 "cambiar clave con la actual mala"
expect "$(status POST /api/v1/auth/change-password "{\"currentPassword\":\"$PASS\",\"newPassword\":\"otraClave456\"}" "$ACCESS")" 204 "cambiar clave"
expect "$(status POST /api/v1/auth/refresh "{\"refreshToken\":\"$REFRESH\"}")" 400 "cambiar clave cerró sesiones"

expect "$(status POST /api/v1/auth/forgot-password '{"email":"nadie@correo.com"}')" 202 "olvidé clave (correo inexistente)"
expect "$(status POST /api/v1/auth/forgot-password "{\"email\":\"$EMAIL\"}")" 202 "olvidé clave"
RESET=$(token_from_mail "Restablece")
[ -n "$RESET" ] && ok "llegó el correo de restablecer" || fail "no llegó el correo de restablecer"
expect "$(status POST /api/v1/auth/reset-password "{\"token\":\"$RESET\",\"newPassword\":\"claveNueva789\"}")" 204 "restablecer clave"
expect "$(status POST /api/v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"claveNueva789\"}")" 200 "login con la clave nueva"
REFRESH=$(jq -r .refreshToken /tmp/e2e-body)
expect "$(status POST /api/v1/auth/logout "{\"refreshToken\":\"$REFRESH\"}")" 204 "logout"
expect "$(status POST /api/v1/auth/refresh "{\"refreshToken\":\"$REFRESH\"}")" 400 "refresh después de logout"
echo "Listo: el contrato se cumple."
```

Se usa pasándole la URL de la API:

```bash
chmod +x e2e.sh
./e2e.sh http://localhost:8080
```

La salida esperada termina así:

```text
  ✔ restablecer clave (204)
  ✔ login con la clave nueva (200)
  ✔ logout (204)
  ✔ refresh después de logout (400)
Listo: el contrato se cumple.
```

El script usa la API de Mailpit (`/api/v1/search` y `/api/v1/message/{id}`) para sacar el token del texto plano del correo. Por eso las plantillas de texto siempre incluyen el enlace completo con `token=`.

<a id="equivalencias"></a>

## Cómo se ve cada pieza en cada stack

Esta tabla es el mapa de la serie. Cuando lean una entrega, pueden volver aquí para ubicar cada pieza.

| Pieza | Express | NestJS | .NET 10 | Spring Boot |
|---|---|---|---|---|
| HTTP | Express 5.3 | NestJS 12.6 | ASP.NET Core controllers | Spring MVC (Boot 4.2) |
| Validación | Zod 4 | class-validator | FluentValidation 12 | Jakarta Validation |
| Persistencia | Drizzle ORM | TypeORM 1.1 | EF Core 10 + Npgsql | JdbcClient |
| Migraciones | Drizzle Kit | TypeORM | `dotnet ef` | Flyway |
| JWT | jsonwebtoken | @nestjs/jwt | JsonWebTokenHandler + JwtBearer | Nimbus (resource server) |
| Correo | Nodemailer + funciones | Nodemailer + Handlebars | MailKit 5 + plantillas incrustadas | JavaMailSender + Thymeleaf |
| DI | `container.ts` a mano | Módulos de Nest | `IServiceCollection` | `@Configuration` |
| Docs | swagger-ui-express | @nestjs/swagger | Swashbuckle | springdoc-openapi |
| Pruebas | Vitest | Vitest | xUnit v3 | JUnit 6 |

| Pieza | Laravel | Rust | FastAPI | Go |
|---|---|---|---|---|
| HTTP | Laravel 13 | Axum 0.8 | FastAPI 0.165 | `net/http` (ServeMux) |
| Validación | FormRequest | validator | Pydantic | validator/v10 |
| Persistencia | Query Builder | SQLx 0.9 | SQLAlchemy 2.1 Core | pgx v5 |
| Migraciones | `artisan migrate` | `sqlx::migrate!` | Alembic | goose |
| JWT | firebase/php-jwt 7 | jsonwebtoken 12 | PyJWT | golang-jwt v5 |
| Correo | Mail de Laravel + Blade | lettre + funciones | smtplib + Jinja2 | `net/smtp` + funciones |
| DI | Service provider | `Arc<dyn Trait>` en `main` | `Depends` | `main` a mano |
| Docs | Scramble | utoipa | Nativo de FastAPI | Swagger UI + YAML embebido |
| Pruebas | PHPUnit 12 | `cargo test` | pytest | `go test` |

Todo es software libre y gratuito. Evité a propósito librerías que cambiaron a licencia comercial, como AutoMapper 15+, MediatR y FluentAssertions 8, y servicios de pago.

Los puertos de cada API, para poder levantarlas todas a la vez, quedaron así en mis pruebas: Rust 8080, Go 8081, FastAPI 8082, Express 8083, NestJS 8084, Laravel 8085, Spring 8086 y .NET 8087. Cada una tiene su propia base (`baseapi`, `baseapi_go`, `baseapi_py`, etc.) para que no se pisen las migraciones.

<a id="solid"></a>

## SOLID, DRY y KISS en el diseño

SOLID es un conjunto de cinco principios de diseño orientado a objetos. Así aparecen en la serie, con nombres de piezas concretas:

- **S, responsabilidad única.** El controlador solo traduce HTTP. `AuthService` solo orquesta casos de uso. `SmtpMailer` solo envía. `EmailRenderer` solo arma plantillas. Si cambia el diseño del correo, no toco el servicio.
- **O, abierto/cerrado.** Para enviar correos con una API de terceros en vez de SMTP, escribo otro adaptador de `EmailSender` y lo cambio en el composition root. `AuthService` no se modifica.
- **L, sustitución de Liskov.** Los dobles en memoria de las pruebas cumplen el mismo contrato que los repositorios reales. Por eso el servicio no nota la diferencia.
- **I, segregación de interfaces.** Tres repositorios pequeños en vez de uno gigante. `AccessTokenIssuer` solo emite; validar el token es trabajo del middleware de la API.
- **D, inversión de dependencias.** `AuthService` depende de interfaces del dominio, nunca de Postgres ni de SMTP.

**DRY** (Don't Repeat Yourself, no te repitas): la regla de la contraseña vive en un solo lugar del dominio, `User.validatePassword` o su equivalente, y la usan registro, cambio y restablecimiento. **KISS** (Keep It Simple, mantenlo simple): no hay CQRS, ni eventos, ni mediadores, ni un repositorio genérico. Un servicio con nueve métodos se lee de arriba abajo en cinco minutos.

<a id="extender"></a>

## Cómo agrego otro endpoint a todos los stacks

El proceso es el mismo en los ocho, y lo repito en cada entrega con su código. Tomemos como ejemplo un `POST /resend-verification` que reenvía el correo de bienvenida:

1. **Contrato primero.** Lo agrego a `openapi.yaml`: cuerpo `{email}`, respuesta 202 siempre (igual que `forgot-password`, para no enumerar usuarios).
2. **Prueba de contrato.** Agrego un paso a `e2e.sh` que lo llama y comprueba que llegó un segundo correo.
3. **Dominio.** ¿Necesito un puerto nuevo? En este caso no: ya tengo `OneTimeTokenRepository` y `EmailSender`.
4. **Aplicación.** Un método nuevo en `AuthService`: busca el usuario; si no existe o ya está verificado, no hace nada; si no, crea otro token `verify_email` y envía la plantilla `welcome-verify`.
5. **API.** Una ruta nueva con su DTO validado.
6. **Pruebas unitarias.** Una prueba con dobles: usuario sin verificar recibe correo; usuario verificado no.
7. **Correr `e2e.sh`.**

Si el cambio necesita una columna nueva, entre el paso 3 y el 4 va una migración.

<a id="errores-tipicos"></a>

## Errores típicos y trampas compartidas

Estas trampas me salieron en más de un stack, así que las dejo aquí y las repito en la entrega que corresponda:

- **La transacción que deshace la revocación.** Si envuelven cada petición en una transacción y hacen rollback cuando hay un error, el caso "refresh reusado" se rompe: revocan todas las sesiones, lanzan el error de dominio... y el rollback deshace la revocación. Me pasó en FastAPI. La solución es confirmar la transacción cuando el error es de dominio, o no usar una transacción por petición. En Spring, `@Transactional` hace rollback con cualquier `RuntimeException`, así que hay que tener el mismo cuidado.
- **`localhost` contra `127.0.0.1`** en SMTP, como conté arriba.
- **Un `.env` cargado en la terminal que pisa al del proyecto.** Si hicieron `source .env` en una terminal y luego cambian el archivo, la variable vieja sigue viva y gana. `unset` o una terminal nueva.
- **Comparar el hash del token en vez del token.** El cliente envía el valor; la base tiene el hash. Siempre se hashea lo que llega y se busca por hash.
- **Olvidar que el refresh también vence.** Revisar `revoked_at` no basta: también `expires_at`.

<a id="diferencias"></a>

## Dónde el diseño no es perfecto

Prefiero decirlo yo antes de que me lo digan:

- **No hay rate limiting** (límite de peticiones). Un atacante puede probar claves sin freno. Es el reto de una de las entregas.
- **No hay roles ni permisos.** El JWT solo dice quién eres.
- **El access token no se puede revocar.** Si alguien lo roba, sirve hasta que vence, como máximo 15 minutos. Es el precio de no ir a la base en cada petición.
- **Los correos se envían dentro de la petición.** Si el SMTP está lento, el registro también. Lo correcto en producción es una cola. Lo dejo así por simplicidad.
- **Los tokens viejos no se limpian.** Las tablas crecen. Hace falta un job periódico que borre los vencidos.
- **El correo se compara en minúsculas, pero sin normalizar Unicode.** Para la mayoría de casos basta.

<a id="checklist"></a>

## Checklist

- [ ] Docker, curl y jq instalados.
- [ ] `docker compose up -d` con Postgres y Mailpit arriba.
- [ ] `.env` copiado de `.env.example`, con un `JWT_SECRET` propio de 32 caracteres o más.
- [ ] Entiendo qué va en cada capa y qué es un puerto.
- [ ] Entiendo por qué el refresh es opaco y se guarda hasheado.
- [ ] Sé qué hace `e2e.sh` y cómo pasarle la URL.
- [ ] Elegí el primer stack para seguir la serie.

<a id="resumen"></a>

## Resumen

Como acabamos de ver, la API base tiene un contrato fijo de nueve endpoints, tres tablas, cuatro capas y un puñado de puertos que separan el negocio de la tecnología. Los tokens de acceso son JWT cortos, los refresh son opacos, rotan y detectan robos, y los enlaces de los correos usan tokens de un solo uso. Todo error sale como Problem Details, y un script en bash comprueba que cada stack cumple lo mismo.

Lo mejor de tener un contrato así es que deja de importar el lenguaje. Puedo cambiar de stack y el frontend sigue igual. En la siguiente entrega empezamos con [Node.js + TypeScript y Express](/post/crear-base-api-node-express). ¿Ustedes con cuál empezarían?

<a id="reto"></a>

## Reto

Para el archivo `src/app/features/challenges/challenges.data.ts`:

```ts
{
  slug: 'crear-base-api-contrato-resend-verification',
  title: 'Diseña el endpoint resend-verification',
  summary: 'Agrega al contrato OpenAPI y a e2e.sh un endpoint que reenvía el correo de verificación sin revelar qué cuentas existen.',
  difficulty: 'warmup',
  tags: ['api', 'openapi', 'seguridad', 'crear-base-api'],
  language: 'YAML',
  articleSlug: 'crear-base-api-introduccion',
  articleTitle: 'Crear base API: el diseño común (DDD, DI, JWT y correo)',
  prompt: 'Agrega a openapi.yaml la ruta POST /api/v1/auth/resend-verification. Recibe {email} y debe responder igual exista o no la cuenta. Después agrega a e2e.sh un paso que registre un usuario, llame al endpoint y compruebe en Mailpit que llegaron dos correos de bienvenida.',
  hint: 'Copia la forma de forgot-password: mismo cuerpo, mismo 202. Para contar correos en Mailpit, la búsqueda devuelve messages_count.',
  solution: `# openapi.yaml (dentro de paths)
  /api/v1/auth/resend-verification:
    post:
      tags: [auth]
      summary: Reenvía el correo de verificación
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/EmailRequest' }
      responses:
        '202': { description: Aceptado (exista o no la cuenta) }
        '400': { $ref: '#/components/responses/Problem' }

# e2e.sh (después del registro)
expect "$(status POST /api/v1/auth/resend-verification "{\\"email\\":\\"$EMAIL\\"}")" 202 "reenviar verificación"
sleep 1
COUNT=$(curl -s "$MAIL/api/v1/search?query=to:$EMAIL%20subject:confirma" | jq .messages_count)
[ "$COUNT" = "2" ] && ok "llegaron dos correos" || fail "esperaba 2 correos y hay $COUNT"`,
},
```
