---
title: "Crear base API: .NET 10 con EF Core, FluentValidation y MailKit"
author: Hugo Colmenares
date: 2026-11-26
series: Crear base API
tags: [crear-base-api, dotnet, efcore, jwt, csharp]
excerpt: La API base en .NET 10 con cuatro proyectos por capa, EF Core con Postgres, JWT con refresh rotativo, FluentValidation, MailKit y Problem Details.
---

Esta es la entrega de **.NET 10** de la serie **Crear base API**. El contrato, las tablas, el `docker-compose.yml` y el script `e2e.sh` están en la [introducción](/post/crear-base-api-introduccion). Las entregas hermanas de Node son [Express](/post/crear-base-api-node-express) y [NestJS](/post/crear-base-api-nestjs).

Mi plantilla de .NET de siempre es [BaseApiNetCore10](https://github.com/FeithNoir/BaseApiNetCore10), que expliqué en la serie [Construyendo APIs por capas](/post/construyendo-apis-por-capas-dotnet). Aquí la tomo como punto de partida y la llevo al contrato común. El código de esta entrega ya está en ese mismo repo: el 26 de noviembre de 2026 lo actualicé para que coincida con lo que van a ver aquí (es un salto grande, no un parche). Lo escribí para esta serie, lo probé el 25 de noviembre de 2026 y pasa las 28 comprobaciones de `e2e.sh`. Al final están todas las diferencias contra la plantilla anterior, que dejé en la rama `legacy/2026-02-plantilla-identity-sqlite` por si alguien todavía la usa.

<a id="contenido"></a>

## Contenido

1. [Prerrequisitos](/post/crear-base-api-dotnet#prerrequisitos)
2. [Qué estoy construyendo y qué cambia frente a BaseApiNetCore10](/post/crear-base-api-dotnet#que-estoy-construyendo)
3. [Instalación](/post/crear-base-api-dotnet#instalacion)
4. [Carpetas y estructura](/post/crear-base-api-dotnet#carpetas)
5. [SOLID, DRY y KISS en este proyecto](/post/crear-base-api-dotnet#solid)
6. [Domain](/post/crear-base-api-dotnet#domain)
7. [Application](/post/crear-base-api-dotnet#application)
8. [Infrastructure](/post/crear-base-api-dotnet#infrastructure)
9. [Api: Program.cs, filtro, manejador de errores y controlador](/post/crear-base-api-dotnet#api)
10. [Migraciones con dotnet ef](/post/crear-base-api-dotnet#migraciones)
11. [Pruebas unitarias con xUnit v3](/post/crear-base-api-dotnet#pruebas)
12. [Probarlo de punta a punta](/post/crear-base-api-dotnet#probarlo)
13. [Cómo agrego otro endpoint de punta a punta](/post/crear-base-api-dotnet#extender)
14. [Errores típicos y trampas](/post/crear-base-api-dotnet#errores-tipicos)
15. [Dónde el código no coincide con el esquema (ni con el repo)](/post/crear-base-api-dotnet#diferencias)
16. [Checklist](/post/crear-base-api-dotnet#checklist)
17. [Resumen](/post/crear-base-api-dotnet#resumen)
18. [Reto](/post/crear-base-api-dotnet#reto)

<a id="prerrequisitos"></a>

## Prerrequisitos

- **SDK de .NET 10.** Lo probé con el SDK 10.0.404 (runtime 10.0.15). Ya salió .NET 11, pero me quedo en la 10 porque es LTS (soporte largo) y es la que usa BaseApiNetCore10.
- **Docker** para Postgres y Mailpit.
- **curl** y **jq**.

En Linux instalo el SDK con el script oficial, por canal:

```bash
curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
bash /tmp/dotnet-install.sh --channel 10.0
export DOTNET_ROOT="$HOME/.dotnet" PATH="$HOME/.dotnet:$PATH"
dotnet --version
```

En Windows, el instalador desde [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/10.0).

<a id="que-estoy-construyendo"></a>

## Qué estoy construyendo y qué cambia frente a BaseApiNetCore10

El contrato común de la serie, con paquetes libres y gratuitos verificados en NuGet el 25 de noviembre de 2026 (las versiones exactas van en los comandos de instalación). Estas son las diferencias de fondo frente al repo:

| | BaseApiNetCore10 | Esta entrega |
|---|---|---|
| Proyectos | Api, Business, Core, Data | Api, Application, Domain, Infrastructure (+ Tests) |
| Base de datos | SQLite | Postgres con Npgsql |
| Usuarios | ASP.NET Core Identity completo (`AddIdentity<User, IdentityRole>`) | Entidad `User` propia; de Identity solo uso `PasswordHasher<T>` |
| Mapeo | AutoMapper 14 | A mano (`ToResponse`), sin librería |
| Servicio | `AuthService` concreto, sin interfaz | `IAuthService` + `AuthService` |
| Tokens | Solo access token | Access + refresh rotativo + tokens de un solo uso |
| Errores | Respuestas propias | Problem Details con `IExceptionHandler` |
| Validación | Data annotations | FluentValidation 12 |
| Secretos | user-secrets | Variables de entorno con los nombres comunes de la serie |

¿Por qué sin AutoMapper? Porque desde la versión 15 cambió a licencia comercial. El repo usa la 14, que sigue siendo MIT, pero para una plantilla nueva prefiero no depender de una librería que ya no tendrá parches libres. Lo mismo con MediatR y FluentAssertions 8, que también pasaron a licencia comercial.

¿Y por qué dejar Identity completo? Porque trae su propio esquema (`AspNetUsers`, `AspNetRoles` y varias tablas más). Para que las tablas sean iguales en los ocho stacks, uso mi entidad y de Identity solo tomo la pieza que hashea claves.

<a id="instalacion"></a>

## Instalación

Si prefieren partir del resultado en vez de escribirlo todo a mano, el código está en [BaseApiNetCore10](https://github.com/FeithNoir/BaseApiNetCore10):

```bash
git clone https://github.com/FeithNoir/BaseApiNetCore10.git
cd BaseApiNetCore10
```

El resto de esta sección es el camino paso a paso, por si quieren reconstruirlo.

Creo la solución en el formato nuevo `.slnx` (XML simple, como el repo) y los cuatro proyectos:

```bash
mkdir dotnet && cd dotnet
dotnet new sln -n BaseApi --format slnx
dotnet new classlib -n BaseApi.Domain -o src/BaseApi.Domain
dotnet new classlib -n BaseApi.Application -o src/BaseApi.Application
dotnet new classlib -n BaseApi.Infrastructure -o src/BaseApi.Infrastructure
dotnet new web -n BaseApi.Api -o src/BaseApi.Api
find . -name Class1.cs -delete
```

Las referencias van siempre hacia adentro: Api conoce Infrastructure, Infrastructure conoce Application y Application conoce Domain. Domain no conoce a nadie.

```bash
dotnet add src/BaseApi.Application reference src/BaseApi.Domain
dotnet add src/BaseApi.Infrastructure reference src/BaseApi.Application
dotnet add src/BaseApi.Api reference src/BaseApi.Infrastructure
```

Agrego los paquetes con versión fija:

```bash
cd src
dotnet add BaseApi.Application package FluentValidation --version 12.2.0
dotnet add BaseApi.Application package FluentValidation.DependencyInjectionExtensions --version 12.2.0
dotnet add BaseApi.Application package Microsoft.Extensions.Options --version 10.0.15
dotnet add BaseApi.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL --version 10.0.4
dotnet add BaseApi.Infrastructure package Microsoft.EntityFrameworkCore.Design --version 10.0.15
dotnet add BaseApi.Infrastructure package MailKit --version 5.0.0
dotnet add BaseApi.Infrastructure package Microsoft.IdentityModel.JsonWebTokens --version 8.23.0
dotnet add BaseApi.Api package Microsoft.AspNetCore.Authentication.JwtBearer --version 10.0.15
dotnet add BaseApi.Api package Swashbuckle.AspNetCore --version 10.3.1
dotnet add BaseApi.Api package Microsoft.EntityFrameworkCore.Design --version 10.0.15
cd ..
```

El proyecto de pruebas lo escribo a mano, porque la plantilla `xunit` que trae el SDK todavía es de xUnit v2. Va en `tests/BaseApi.Tests/BaseApi.Tests.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <OutputType>Exe</OutputType>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="xunit.v3" Version="4.0.3" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\BaseApi.Application\BaseApi.Application.csproj" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

</Project>
```

Y lo agrego a la solución junto con los demás:

```bash
dotnet add tests/BaseApi.Tests reference src/BaseApi.Application
dotnet sln add src/BaseApi.Domain src/BaseApi.Application src/BaseApi.Infrastructure src/BaseApi.Api tests/BaseApi.Tests
```

La solución queda así:

```xml
<Solution>
  <Folder Name="/src/">
    <Project Path="src/BaseApi.Api/BaseApi.Api.csproj" />
    <Project Path="src/BaseApi.Application/BaseApi.Application.csproj" />
    <Project Path="src/BaseApi.Domain/BaseApi.Domain.csproj" />
    <Project Path="src/BaseApi.Infrastructure/BaseApi.Infrastructure.csproj" />
  </Folder>
  <Folder Name="/tests/">
    <Project Path="tests/BaseApi.Tests/BaseApi.Tests.csproj" />
  </Folder>
</Solution>
```

xUnit v3 corre sobre **Microsoft.Testing.Platform**, el motor de pruebas nuevo. Con el SDK 10, `dotnet test` exige declararlo en un `global.json`, que de paso fija la versión del SDK:

```json
{
  "sdk": {
    "version": "10.0.404",
    "rollForward": "latestFeature"
  },
  "test": {
    "runner": "Microsoft.Testing.Platform"
  }
}
```

La herramienta de migraciones va como herramienta local, para que quede fijada en el repo:

```bash
dotnet new tool-manifest
dotnet tool install dotnet-ef --version 10.0.15
```

Los `.csproj` quedan como los dejan los comandos, salvo el de Infrastructure, que edito a mano para agregar dos cosas: `FrameworkReference` a `Microsoft.AspNetCore.App`, que me da opciones, configuración y el `PasswordHasher` sin paquetes sueltos, y `EmbeddedResource` para meter las plantillas de correo dentro de la DLL.

```xml
﻿<Project Sdk="Microsoft.NET.Sdk">

  <ItemGroup>
    <ProjectReference Include="..\BaseApi.Application\BaseApi.Application.csproj" />
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="MailKit" Version="5.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.15">
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Microsoft.IdentityModel.JsonWebTokens" Version="8.23.0" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.4" />
  </ItemGroup>

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <EmbeddedResource Include="Mail\Templates\*.*" />
  </ItemGroup>

</Project>
```

<a id="carpetas"></a>

## Carpetas y estructura

```text
dotnet/
├── BaseApi.slnx
├── global.json
├── dotnet-tools.json
├── src/
│   ├── BaseApi.Domain/
│   │   ├── DomainException.cs
│   │   ├── Ports/Ports.cs
│   │   ├── Tokens/Tokens.cs
│   │   └── Users/{Email.cs, User.cs}
│   ├── BaseApi.Application/
│   │   ├── Auth/{AuthService.cs, AuthSettings.cs, Dtos.cs, Validators.cs}
│   │   └── DependencyInjection.cs
│   ├── BaseApi.Infrastructure/
│   │   ├── Persistence/{AppDbContext.cs, Repositories.cs, Migrations/}
│   │   ├── Security/Security.cs
│   │   ├── Mail/{Mail.cs, Templates/}
│   │   └── DependencyInjection.cs
│   └── BaseApi.Api/
│       ├── Controllers/AuthController.cs
│       ├── Infrastructure/{ValidationFilter.cs, DomainExceptionHandler.cs}
│       ├── Program.cs
│       └── appsettings.json
└── tests/BaseApi.Tests/AuthServiceTests.cs
```

Cada capa con su `DependencyInjection.cs` es una costumbre del repo (allí era `AddCustomServices`).

<a id="solid"></a>

## SOLID, DRY y KISS en este proyecto

- **S:** `AuthController` traduce HTTP, `ValidationFilter` valida, `DomainExceptionHandler` formatea errores, `MailKitEmailSender` envía.
- **O:** cambiar MailKit por otro proveedor es una línea en `Infrastructure/DependencyInjection.cs`.
- **L:** las pruebas usan dobles que implementan las mismas interfaces.
- **I:** tres repositorios pequeños; `IEmailSender` e `IEmailRenderer` separados.
- **D:** `AuthService` depende de `IUserRepository`, no de `AppDbContext`.
- **DRY:** `User.ValidatePassword` y la traducción de errores viven en un solo lugar. **KISS:** sin MediatR, sin repositorio genérico, sin AutoMapper.

<a id="domain"></a>

## Domain

Bien, empiezo por adentro. El error de negocio con su `Kind`:

```csharp
namespace BaseApi.Domain;

public enum DomainErrorKind { Validation, Conflict, Unauthorized, Forbidden, InvalidToken }

/// <summary>Error de negocio. El middleware de la API lo traduce a Problem Details.</summary>
public sealed class DomainException(DomainErrorKind kind, string message) : Exception(message)
{
    public DomainErrorKind Kind { get; } = kind;

    public static DomainException Validation(string msg) => new(DomainErrorKind.Validation, msg);
    public static DomainException EmailTaken() => new(DomainErrorKind.Conflict, "El correo ya está registrado");
    public static DomainException InvalidCredentials() => new(DomainErrorKind.Unauthorized, "Credenciales inválidas");
    public static DomainException Unauthorized() => new(DomainErrorKind.Unauthorized, "No autenticado");
    public static DomainException EmailNotVerified() => new(DomainErrorKind.Forbidden, "Debes verificar tu correo antes de iniciar sesión");
    public static DomainException InvalidToken() => new(DomainErrorKind.InvalidToken, "El token es inválido o expiró");
}
```

El value object `Email`. Uso `[GeneratedRegex]`, que genera la expresión regular en tiempo de compilación en vez de interpretarla al arrancar:

```csharp
using System.Text.RegularExpressions;

namespace BaseApi.Domain.Users;

/// <summary>Value object: correo normalizado (minúsculas, sin espacios) y con forma válida.</summary>
public sealed partial record Email
{
    public string Value { get; }

    private Email(string value) => Value = value;

    public static Email Parse(string? raw)
    {
        var v = (raw ?? "").Trim().ToLowerInvariant();
        if (v.Length > 254 || !Shape().IsMatch(v))
            throw DomainException.Validation("email: formato inválido");
        return new Email(v);
    }

    public override string ToString() => Value;

    [GeneratedRegex(@"^[^@\s]+@[^@\s.][^@\s]*\.[^@\s]+$")]
    private static partial Regex Shape();
}
```

El usuario. Los setters son privados y el constructor vacío es privado, solo para EF Core. El estado cambia por métodos con nombre de negocio. Para el id uso `Guid.CreateVersion7`, que existe desde .NET 9: genera UUID v7, que van ordenados por tiempo y le caen mejor a los índices de la base que los aleatorios.

```csharp
namespace BaseApi.Domain.Users;

/// <summary>
/// Entidad de dominio. Setters privados: el estado solo cambia por métodos con nombre de negocio.
/// EF Core la mapea desde Infrastructure con Fluent API, sin atributos aquí.
/// </summary>
public class User
{
    public Guid Id { get; private set; }
    public Email Email { get; private set; } = null!;
    public string Name { get; private set; } = "";
    public string PasswordHash { get; private set; } = "";
    public DateTimeOffset? EmailVerifiedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    private User() { } // para EF Core

    public static User Register(Email email, string name, string passwordHash, DateTimeOffset now) => new()
    {
        Id = Guid.CreateVersion7(now),
        Email = email,
        Name = name.Trim(),
        PasswordHash = passwordHash,
        CreatedAt = now,
        UpdatedAt = now,
    };

    /// <summary>Regla única de la serie: 8 a 72 caracteres.</summary>
    public static void ValidatePassword(string? raw)
    {
        var len = raw is null ? 0 : raw.EnumerateRunes().Count();
        if (len is < 8 or > 72)
            throw DomainException.Validation("password: debe tener entre 8 y 72 caracteres");
    }

    public bool IsVerified => EmailVerifiedAt is not null;

    public void VerifyEmail(DateTimeOffset now)
    {
        if (EmailVerifiedAt is not null) return;
        EmailVerifiedAt = now;
        UpdatedAt = now;
    }

    public void ChangePassword(string newHash, DateTimeOffset now)
    {
        PasswordHash = newHash;
        UpdatedAt = now;
    }
}
```

Los tokens, con su lógica pequeña adentro (`IsExpired`, `Revoke`, `MarkUsed`):

```csharp
namespace BaseApi.Domain.Tokens;

public enum TokenPurpose { VerifyEmail, ResetPassword }

public class RefreshToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = "";
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private RefreshToken() { }

    public static RefreshToken Create(Guid userId, string hash, DateTimeOffset now, TimeSpan ttl) => new()
    {
        Id = Guid.CreateVersion7(now), UserId = userId, TokenHash = hash, CreatedAt = now, ExpiresAt = now + ttl,
    };

    public bool IsRevoked => RevokedAt is not null;
    public bool IsExpired(DateTimeOffset now) => ExpiresAt <= now;
    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;
}

public class OneTimeToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public TokenPurpose Purpose { get; private set; }
    public string TokenHash { get; private set; } = "";
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? UsedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    private OneTimeToken() { }

    public static OneTimeToken Create(Guid userId, TokenPurpose purpose, string hash, DateTimeOffset now, TimeSpan ttl) => new()
    {
        Id = Guid.CreateVersion7(now), UserId = userId, Purpose = purpose, TokenHash = hash, CreatedAt = now, ExpiresAt = now + ttl,
    };

    public void MarkUsed(DateTimeOffset now) => UsedAt = now;
}
```

Y los puertos. Fíjense que no hay un puerto `Clock`: .NET 8 trajo `TimeProvider`, una clase abstracta estándar para el tiempo, y la uso directamente.

```csharp
using BaseApi.Domain.Tokens;
using BaseApi.Domain.Users;

namespace BaseApi.Domain.Ports;

// Puertos: el dominio dice QUÉ necesita; Infrastructure decide CÓMO.

public interface IUserRepository
{
    Task<User?> FindByEmailAsync(Email email, CancellationToken ct);
    Task<User?> FindByIdAsync(Guid id, CancellationToken ct);
    Task AddAsync(User user, CancellationToken ct);
    Task UpdateAsync(User user, CancellationToken ct);
}

public interface IRefreshTokenRepository
{
    Task AddAsync(RefreshToken token, CancellationToken ct);
    Task<RefreshToken?> FindByHashAsync(string hash, CancellationToken ct);
    Task UpdateAsync(RefreshToken token, CancellationToken ct);
    Task RevokeAllForUserAsync(Guid userId, DateTimeOffset at, CancellationToken ct);
}

public interface IOneTimeTokenRepository
{
    Task AddAsync(OneTimeToken token, CancellationToken ct);
    Task<OneTimeToken?> FindValidAsync(string hash, TokenPurpose purpose, DateTimeOffset now, CancellationToken ct);
    Task UpdateAsync(OneTimeToken token, CancellationToken ct);
}

public interface IPasswordHasher
{
    string Hash(string plain);
    bool Verify(string plain, string hash);
}

public sealed record IssuedAccessToken(string Token, int ExpiresIn);

public interface IAccessTokenIssuer
{
    IssuedAccessToken Issue(User user);
}

public sealed record GeneratedToken(string Value, string Hash);

public interface IOpaqueTokens
{
    GeneratedToken Generate();
    string Hash(string value);
}

public sealed record EmailMessage(string To, string Subject, string Html, string Text);

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct);
}

public interface IEmailRenderer
{
    EmailMessage Render(string template, string to, string subject, IReadOnlyDictionary<string, string> data);
}
```

<a id="application"></a>

## Application

Los DTOs son `record`s:

```csharp
namespace BaseApi.Application.Auth;

// DTOs del contrato. Los records ya traen constructor, igualdad y ToString.
public sealed record RegisterRequest(string Email, string Password, string Name);
public sealed record LoginRequest(string Email, string Password);
public sealed record RefreshRequest(string RefreshToken);
public sealed record TokenRequest(string Token);
public sealed record EmailRequest(string Email);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record ResetPasswordRequest(string Token, string NewPassword);

public sealed record TokenPairResponse(string AccessToken, string RefreshToken, string TokenType, int ExpiresIn);
public sealed record UserResponse(Guid Id, string Email, string Name, bool EmailVerified, DateTimeOffset CreatedAt);
```

Los validadores de FluentValidation. Validan la forma de los datos; las reglas de negocio siguen en el dominio:

```csharp
using FluentValidation;

namespace BaseApi.Application.Auth;

// FluentValidation: reglas de forma (campos vacíos, largos). Las reglas de negocio viven en el dominio.

public sealed class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("es obligatorio")
            .EmailAddress().WithMessage("formato inválido").MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty().WithMessage("es obligatorio")
            .Length(8, 72).WithMessage("debe tener entre 8 y 72 caracteres");
        RuleFor(x => x.Name).NotEmpty().WithMessage("es obligatorio")
            .Length(2, 100).WithMessage("debe tener entre 2 y 100 caracteres");
    }
}

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("es obligatorio").EmailAddress().WithMessage("formato inválido");
        RuleFor(x => x.Password).NotEmpty().WithMessage("es obligatorio");
    }
}

public sealed class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator() => RuleFor(x => x.RefreshToken).NotEmpty().WithMessage("es obligatorio");
}

public sealed class TokenRequestValidator : AbstractValidator<TokenRequest>
{
    public TokenRequestValidator() => RuleFor(x => x.Token).NotEmpty().WithMessage("es obligatorio");
}

public sealed class EmailRequestValidator : AbstractValidator<EmailRequest>
{
    public EmailRequestValidator() =>
        RuleFor(x => x.Email).NotEmpty().WithMessage("es obligatorio").EmailAddress().WithMessage("formato inválido");
}

public sealed class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("es obligatorio");
        RuleFor(x => x.NewPassword).NotEmpty().WithMessage("es obligatorio")
            .Length(8, 72).WithMessage("debe tener entre 8 y 72 caracteres");
    }
}

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("es obligatorio");
        RuleFor(x => x.NewPassword).NotEmpty().WithMessage("es obligatorio")
            .Length(8, 72).WithMessage("debe tener entre 8 y 72 caracteres");
    }
}
```

Los ajustes que el servicio necesita:

```csharp
namespace BaseApi.Application.Auth;

public sealed class AuthSettings
{
    public string AppUrl { get; set; } = "http://localhost:4200";
    public int RefreshTtlDays { get; set; } = 7;
}
```

Y el servicio. Uso un *primary constructor* (C# 12): los parámetros del constructor van en la línea de la clase y están disponibles en todo el cuerpo. Es la forma más corta de escribir inyección por constructor en C#.

```csharp
using BaseApi.Domain;
using BaseApi.Domain.Ports;
using BaseApi.Domain.Tokens;
using BaseApi.Domain.Users;
using Microsoft.Extensions.Options;

namespace BaseApi.Application.Auth;

public interface IAuthService
{
    Task<UserResponse> RegisterAsync(RegisterRequest req, CancellationToken ct);
    Task VerifyEmailAsync(TokenRequest req, CancellationToken ct);
    Task<TokenPairResponse> LoginAsync(LoginRequest req, CancellationToken ct);
    Task<TokenPairResponse> RefreshAsync(RefreshRequest req, CancellationToken ct);
    Task LogoutAsync(RefreshRequest req, CancellationToken ct);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req, CancellationToken ct);
    Task ForgotPasswordAsync(EmailRequest req, CancellationToken ct);
    Task ResetPasswordAsync(ResetPasswordRequest req, CancellationToken ct);
    Task<UserResponse> MeAsync(Guid userId, CancellationToken ct);
}

/// <summary>
/// Casos de uso de autenticación. Recibe TODO por constructor (primary constructor de C# 12);
/// no sabe si detrás hay Postgres, MailKit o dobles de prueba.
/// </summary>
public sealed class AuthService(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    IOneTimeTokenRepository oneTimeTokens,
    IPasswordHasher hasher,
    IAccessTokenIssuer accessTokens,
    IOpaqueTokens opaque,
    IEmailSender mailer,
    IEmailRenderer emails,
    TimeProvider clock,
    IOptions<AuthSettings> options) : IAuthService
{
    private readonly AuthSettings _settings = options.Value;

    public async Task<UserResponse> RegisterAsync(RegisterRequest req, CancellationToken ct)
    {
        var email = Email.Parse(req.Email);
        User.ValidatePassword(req.Password);
        if (await users.FindByEmailAsync(email, ct) is not null) throw DomainException.EmailTaken();

        var user = User.Register(email, req.Name, hasher.Hash(req.Password), clock.GetUtcNow());
        await users.AddAsync(user, ct);

        var token = await CreateOneTimeTokenAsync(user, TokenPurpose.VerifyEmail, TimeSpan.FromHours(24), ct);
        var link = $"{_settings.AppUrl}/verify-email?token={token}";
        await mailer.SendAsync(emails.Render("welcome-verify", user.Email.Value, "Bienvenido, confirma tu correo",
            new Dictionary<string, string> { ["name"] = user.Name, ["link"] = link }), ct);
        return ToResponse(user);
    }

    public async Task VerifyEmailAsync(TokenRequest req, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var ott = await oneTimeTokens.FindValidAsync(opaque.Hash(req.Token), TokenPurpose.VerifyEmail, now, ct)
                  ?? throw DomainException.InvalidToken();
        var user = await users.FindByIdAsync(ott.UserId, ct) ?? throw DomainException.InvalidToken();
        user.VerifyEmail(now);
        ott.MarkUsed(now);
        await users.UpdateAsync(user, ct);
        await oneTimeTokens.UpdateAsync(ott, ct);
    }

    public async Task<TokenPairResponse> LoginAsync(LoginRequest req, CancellationToken ct)
    {
        Email email;
        try { email = Email.Parse(req.Email); }
        catch (DomainException) { throw DomainException.InvalidCredentials(); }

        // Mismo error si el correo no existe o la clave falla: no revelamos qué cuentas hay.
        var user = await users.FindByEmailAsync(email, ct);
        if (user is null || !hasher.Verify(req.Password, user.PasswordHash)) throw DomainException.InvalidCredentials();
        if (!user.IsVerified) throw DomainException.EmailNotVerified();
        return await IssuePairAsync(user, ct);
    }

    public async Task<TokenPairResponse> RefreshAsync(RefreshRequest req, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var stored = await refreshTokens.FindByHashAsync(opaque.Hash(req.RefreshToken), ct)
                     ?? throw DomainException.InvalidToken();
        if (stored.IsRevoked)
        {
            // Reuso de un token ya rotado: alguien lo robó. Cerramos todas las sesiones.
            await refreshTokens.RevokeAllForUserAsync(stored.UserId, now, ct);
            throw DomainException.InvalidToken();
        }
        if (stored.IsExpired(now)) throw DomainException.InvalidToken();

        stored.Revoke(now);
        await refreshTokens.UpdateAsync(stored, ct);
        var user = await users.FindByIdAsync(stored.UserId, ct) ?? throw DomainException.InvalidToken();
        return await IssuePairAsync(user, ct);
    }

    public async Task LogoutAsync(RefreshRequest req, CancellationToken ct)
    {
        var stored = await refreshTokens.FindByHashAsync(opaque.Hash(req.RefreshToken), ct);
        if (stored is null || stored.IsRevoked) return; // idempotente
        stored.Revoke(clock.GetUtcNow());
        await refreshTokens.UpdateAsync(stored, ct);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct) ?? throw DomainException.Unauthorized();
        if (!hasher.Verify(req.CurrentPassword, user.PasswordHash))
            throw DomainException.Validation("currentPassword: no es correcta"); // 400, la sesión sí es válida
        User.ValidatePassword(req.NewPassword);

        var now = clock.GetUtcNow();
        user.ChangePassword(hasher.Hash(req.NewPassword), now);
        await users.UpdateAsync(user, ct);
        await refreshTokens.RevokeAllForUserAsync(user.Id, now, ct);
        await mailer.SendAsync(emails.Render("notification", user.Email.Value, "Tu contraseña cambió",
            new Dictionary<string, string>
            {
                ["name"] = user.Name,
                ["message"] = "La contraseña de tu cuenta se cambió hace un momento. Si no fuiste tú, restablécela de inmediato.",
            }), ct);
    }

    public async Task ForgotPasswordAsync(EmailRequest req, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(Email.Parse(req.Email), ct);
        if (user is null) return; // siempre 202: no confirmamos si el correo existe

        var token = await CreateOneTimeTokenAsync(user, TokenPurpose.ResetPassword, TimeSpan.FromMinutes(30), ct);
        var link = $"{_settings.AppUrl}/reset-password?token={token}";
        await mailer.SendAsync(emails.Render("reset-password", user.Email.Value, "Restablece tu contraseña",
            new Dictionary<string, string> { ["name"] = user.Name, ["link"] = link }), ct);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest req, CancellationToken ct)
    {
        User.ValidatePassword(req.NewPassword);
        var now = clock.GetUtcNow();
        var ott = await oneTimeTokens.FindValidAsync(opaque.Hash(req.Token), TokenPurpose.ResetPassword, now, ct)
                  ?? throw DomainException.InvalidToken();
        var user = await users.FindByIdAsync(ott.UserId, ct) ?? throw DomainException.InvalidToken();

        user.ChangePassword(hasher.Hash(req.NewPassword), now);
        user.VerifyEmail(now); // si leyó el correo, el correo es suyo
        ott.MarkUsed(now);
        await users.UpdateAsync(user, ct);
        await oneTimeTokens.UpdateAsync(ott, ct);
        await refreshTokens.RevokeAllForUserAsync(user.Id, now, ct);
        await mailer.SendAsync(emails.Render("notification", user.Email.Value, "Tu contraseña se restableció",
            new Dictionary<string, string>
            {
                ["name"] = user.Name,
                ["message"] = "Restableciste tu contraseña. Cerramos tus sesiones abiertas por seguridad.",
            }), ct);
    }

    public async Task<UserResponse> MeAsync(Guid userId, CancellationToken ct) =>
        ToResponse(await users.FindByIdAsync(userId, ct) ?? throw DomainException.Unauthorized());

    // ---- ayudantes privados ----

    private async Task<TokenPairResponse> IssuePairAsync(User user, CancellationToken ct)
    {
        var access = accessTokens.Issue(user);
        var refresh = opaque.Generate();
        await refreshTokens.AddAsync(
            RefreshToken.Create(user.Id, refresh.Hash, clock.GetUtcNow(), TimeSpan.FromDays(_settings.RefreshTtlDays)), ct);
        return new TokenPairResponse(access.Token, refresh.Value, "Bearer", access.ExpiresIn);
    }

    private async Task<string> CreateOneTimeTokenAsync(User user, TokenPurpose purpose, TimeSpan ttl, CancellationToken ct)
    {
        var t = opaque.Generate();
        await oneTimeTokens.AddAsync(OneTimeToken.Create(user.Id, purpose, t.Hash, clock.GetUtcNow(), ttl), ct);
        return t.Value;
    }

    private static UserResponse ToResponse(User u) => new(u.Id, u.Email.Value, u.Name, u.IsVerified, u.CreatedAt);
}
```

Lo de siempre: 401 genérico en `LoginAsync`, rotación y detección de reuso en `RefreshAsync`, silencio en `ForgotPasswordAsync` y cierre de sesiones al cambiar o restablecer la clave.

El registro de esta capa:

```csharp
using BaseApi.Application.Auth;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace BaseApi.Application;

public static class DependencyInjection
{
    /// <summary>Registra los casos de uso y los validadores de esta capa.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
        return services;
    }
}
```

<a id="infrastructure"></a>

## Infrastructure

El `DbContext` con **Fluent API**: todo el mapeo vive aquí, con nombres de columna en `snake_case` para que la tabla sea igual a la de los demás stacks. El `HasConversion` de `Email` convierte el value object a texto y de vuelta, y el de `Purpose` guarda `verify_email` o `reset_password` en vez de un número.

```csharp
using BaseApi.Domain.Tokens;
using BaseApi.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BaseApi.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<OneTimeToken> OneTimeTokens => Set<OneTimeToken>();

    protected override void OnModelCreating(ModelBuilder b) =>
        b.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
}

// Fluent API: el mapeo vive aquí y no ensucia las entidades con atributos.

internal sealed class UserConfig : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> e)
    {
        e.ToTable("users");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.Email).HasColumnName("email").HasMaxLength(254).IsRequired()
            .HasConversion(v => v.Value, v => Email.Parse(v)); // value object <-> varchar
        e.HasIndex(x => x.Email).IsUnique();
        e.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        e.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
        e.Property(x => x.EmailVerifiedAt).HasColumnName("email_verified_at");
        e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
    }
}

internal sealed class RefreshTokenConfig : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> e)
    {
        e.ToTable("refresh_tokens");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.UserId).HasColumnName("user_id");
        e.Property(x => x.TokenHash).HasColumnName("token_hash").HasColumnType("char(64)").IsRequired();
        e.HasIndex(x => x.TokenHash).IsUnique();
        e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
        e.Property(x => x.RevokedAt).HasColumnName("revoked_at");
        e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        e.HasIndex(x => x.UserId).HasDatabaseName("ix_refresh_tokens_user");
        e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class OneTimeTokenConfig : IEntityTypeConfiguration<OneTimeToken>
{
    public void Configure(EntityTypeBuilder<OneTimeToken> e)
    {
        e.ToTable("one_time_tokens", t =>
            t.HasCheckConstraint("ck_one_time_tokens_purpose", "purpose IN ('verify_email', 'reset_password')"));
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.UserId).HasColumnName("user_id");
        e.Property(x => x.Purpose).HasColumnName("purpose").HasMaxLength(20)
            .HasConversion(
                v => v == TokenPurpose.VerifyEmail ? "verify_email" : "reset_password",
                v => v == "verify_email" ? TokenPurpose.VerifyEmail : TokenPurpose.ResetPassword);
        e.Property(x => x.TokenHash).HasColumnName("token_hash").HasColumnType("char(64)").IsRequired();
        e.HasIndex(x => x.TokenHash).IsUnique();
        e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
        e.Property(x => x.UsedAt).HasColumnName("used_at");
        e.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        e.HasIndex(x => new { x.UserId, x.Purpose }).HasDatabaseName("ix_one_time_tokens_user");
        e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
```

Los repositorios. Cada método llama `SaveChangesAsync` al final. Esto es importante: si envolviera todo en una transacción por petición, el caso de reuso de refresh token (revocar todo y luego lanzar el error) se desharía con el rollback. Para revocar todas las sesiones uso `ExecuteUpdateAsync`, que manda un solo `UPDATE` a la base sin cargar filas en memoria.

```csharp
using BaseApi.Domain;
using BaseApi.Domain.Ports;
using BaseApi.Domain.Tokens;
using BaseApi.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BaseApi.Infrastructure.Persistence;

// Cada método guarda al terminar (SaveChangesAsync). Así una excepción de dominio posterior
// no deshace lo ya escrito, como la revocación por reuso de refresh token.

internal sealed class EfUserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> FindByEmailAsync(Email email, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<User?> FindByIdAsync(Guid id, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task AddAsync(User user, CancellationToken ct)
    {
        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw DomainException.EmailTaken(); // dos registros simultáneos con el mismo correo
        }
    }

    public Task UpdateAsync(User user, CancellationToken ct) => db.SaveChangesAsync(ct);
}

internal sealed class EfRefreshTokenRepository(AppDbContext db) : IRefreshTokenRepository
{
    public async Task AddAsync(RefreshToken token, CancellationToken ct)
    {
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync(ct);
    }

    public Task<RefreshToken?> FindByHashAsync(string hash, CancellationToken ct) =>
        db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

    public Task UpdateAsync(RefreshToken token, CancellationToken ct) => db.SaveChangesAsync(ct);

    // ExecuteUpdate: un solo UPDATE en SQL, sin cargar filas en memoria.
    public Task RevokeAllForUserAsync(Guid userId, DateTimeOffset at, CancellationToken ct) =>
        db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, at), ct);
}

internal sealed class EfOneTimeTokenRepository(AppDbContext db) : IOneTimeTokenRepository
{
    public async Task AddAsync(OneTimeToken token, CancellationToken ct)
    {
        db.OneTimeTokens.Add(token);
        await db.SaveChangesAsync(ct);
    }

    public Task<OneTimeToken?> FindValidAsync(string hash, TokenPurpose purpose, DateTimeOffset now, CancellationToken ct) =>
        db.OneTimeTokens.FirstOrDefaultAsync(
            t => t.TokenHash == hash && t.Purpose == purpose && t.UsedAt == null && t.ExpiresAt > now, ct);

    public Task UpdateAsync(OneTimeToken token, CancellationToken ct) => db.SaveChangesAsync(ct);
}
```

La seguridad. `AspNetPasswordHasher` envuelve el `PasswordHasher` de Identity (PBKDF2 con HMAC-SHA512 y 100 000 iteraciones). `JwtIssuer` usa `JsonWebTokenHandler`, el reemplazo moderno de `JwtSecurityTokenHandler`. Y `RandomTokens` usa `RandomNumberGenerator` y `SHA256.HashData`.

```csharp
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BaseApi.Domain.Ports;
using BaseApi.Domain.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace BaseApi.Infrastructure.Security;

public sealed class JwtOptions
{
    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "baseapi";
    public string Audience { get; set; } = "baseapi-clients";
    public int AccessTtlMinutes { get; set; } = 15;
}

/// <summary>
/// Usa el PasswordHasher de ASP.NET Core Identity (PBKDF2-HMAC-SHA512, 100 000 iteraciones)
/// sin traer todo Identity: solo la pieza que hashea.
/// </summary>
internal sealed class AspNetPasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<object> _inner = new();
    private static readonly object Subject = new();

    public string Hash(string plain) => _inner.HashPassword(Subject, plain);

    public bool Verify(string plain, string hash) =>
        _inner.VerifyHashedPassword(Subject, hash, plain) is not PasswordVerificationResult.Failed;
}

internal sealed class JwtIssuer(IOptions<JwtOptions> options, TimeProvider clock) : IAccessTokenIssuer
{
    private readonly JwtOptions _o = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public IssuedAccessToken Issue(User user)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_o.Secret));
        var token = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email.Value),
            ]),
            Issuer = _o.Issuer,
            Audience = _o.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddMinutes(_o.AccessTtlMinutes),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
        });
        return new IssuedAccessToken(token, _o.AccessTtlMinutes * 60);
    }
}

internal sealed class RandomTokens : IOpaqueTokens
{
    public GeneratedToken Generate()
    {
        var value = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        return new GeneratedToken(value, Hash(value));
    }

    public string Hash(string value) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
```

El correo. MailKit 5 trajo un cambio que me costó un error de compilación: `SendAsync` ya no recibe el `MimeMessage` directo en `SmtpClient`, sino un `SendRequest`. Las plantillas van incrustadas en la DLL y uso marcas `{{clave}}`. En el HTML cada valor pasa por `WebUtility.HtmlEncode`.

```csharp
using System.Net;
using System.Reflection;
using BaseApi.Domain.Ports;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BaseApi.Infrastructure.Mail;

public sealed class SmtpOptions
{
    public string Host { get; set; } = "127.0.0.1";
    public int Port { get; set; } = 1025;
    public string From { get; set; } = "Base API <no-reply@baseapi.local>";
}

/// <summary>Envía por SMTP con MailKit. En local apunta a Mailpit (sin TLS ni usuario).</summary>
internal sealed class MailKitEmailSender(IOptions<SmtpOptions> options) : IEmailSender
{
    private readonly SmtpOptions _o = options.Value;

    public async Task SendAsync(EmailMessage m, CancellationToken ct)
    {
        var msg = new MimeMessage();
        msg.From.Add(MailboxAddress.Parse(_o.From));
        msg.To.Add(MailboxAddress.Parse(m.To));
        msg.Subject = m.Subject;
        msg.Body = new BodyBuilder { HtmlBody = m.Html, TextBody = m.Text }.ToMessageBody();

        using var client = new SmtpClient();
        // Auto: usa STARTTLS si el servidor lo ofrece. En producción exige TLS (SslOnConnect o StartTls).
        await client.ConnectAsync(_o.Host, _o.Port, SecureSocketOptions.Auto, ct);
        await client.SendAsync(new SendRequest(msg), ct); // MailKit 5: el envío recibe un SendRequest
        await client.DisconnectAsync(true, ct);
    }
}

/// <summary>
/// Plantillas como recursos incrustados (Mail/Templates/*.html y *.txt) con marcas {{clave}}.
/// En el HTML cada valor se escapa con WebUtility.HtmlEncode.
/// </summary>
internal sealed class EmbeddedEmailRenderer : IEmailRenderer
{
    private static readonly Assembly Asm = typeof(EmbeddedEmailRenderer).Assembly;

    public EmailMessage Render(string template, string to, string subject, IReadOnlyDictionary<string, string> data)
    {
        var html = Fill(Load($"{template}.html"), data, WebUtility.HtmlEncode);
        var text = Fill(Load($"{template}.txt"), data, v => v).Trim();
        return new EmailMessage(to, subject, html, text);
    }

    private static string Load(string file)
    {
        var name = $"BaseApi.Infrastructure.Mail.Templates.{file}";
        using var stream = Asm.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException($"No encuentro la plantilla {name}");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static string Fill(string tpl, IReadOnlyDictionary<string, string> data, Func<string, string> encode) =>
        data.Aggregate(tpl, (acc, kv) => acc.Replace("{{" + kv.Key + "}}", encode(kv.Value)));
}
```

Las plantillas:

```html
<!DOCTYPE html>
<html lang="es">
<body style="font-family: sans-serif; color: #222;">
  <h1>¡Hola, {{name}}!</h1>
  <p>Gracias por registrarte. Confirma tu correo para activar la cuenta:</p>
  <p><a href="{{link}}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Confirmar correo</a></p>
  <p style="font-size:12px;color:#666;">El enlace vence en 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>
</body>
</html>
```

```text
¡Hola, {{name}}!

Gracias por registrarte. Confirma tu correo con este enlace (vence en 24 horas):
{{link}}

Si no creaste esta cuenta, ignora este mensaje.
```

```html
<!DOCTYPE html>
<html lang="es">
<body style="font-family: sans-serif; color: #222;">
  <h1>Hola, {{name}}</h1>
  <p>Pediste restablecer tu contraseña. Usa este botón:</p>
  <p><a href="{{link}}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Elegir nueva contraseña</a></p>
  <p style="font-size:12px;color:#666;">El enlace vence en 30 minutos. Si no fuiste tú, ignora este correo.</p>
</body>
</html>
```

```text
Hola, {{name}}

Pediste restablecer tu contraseña. Abre este enlace (vence en 30 minutos):
{{link}}

Si no fuiste tú, ignora este correo.
```

```html
<!DOCTYPE html>
<html lang="es">
<body style="font-family: sans-serif; color: #222;">
  <h1>Hola, {{name}}</h1>
  <p>{{message}}</p>
</body>
</html>
```

```text
Hola, {{name}}

{{message}}
```

Y el registro de la capa. Aquí está la decisión que más se aleja del repo: en vez de secciones como `JwtConfig:Secret` con user-secrets, leo las variables con los nombres comunes de la serie (`JWT_SECRET`, `SMTP_HOST`...). ASP.NET Core lee las variables de entorno sin configuración extra, así que `config["JWT_SECRET"]` funciona igual en local, en Docker o en la nube. `ValidateOnStart` hace que la app no arranque si el secreto es corto.

```csharp
using BaseApi.Application.Auth;
using BaseApi.Domain.Ports;
using BaseApi.Infrastructure.Mail;
using BaseApi.Infrastructure.Persistence;
using BaseApi.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BaseApi.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Une cada puerto con su adaptador y lee la configuración con los MISMOS nombres de
    /// variables que el resto de la serie (DATABASE_URL, JWT_SECRET, SMTP_HOST...).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(o => o.UseNpgsql(ToNpgsql(
            config["DATABASE_URL"] ?? "postgres://baseapi:baseapi@localhost:5432/baseapi")));

        services.AddOptions<JwtOptions>()
            .Configure(o =>
            {
                o.Secret = config["JWT_SECRET"] ?? "";
                o.Issuer = config["JWT_ISSUER"] ?? o.Issuer;
                o.Audience = config["JWT_AUDIENCE"] ?? o.Audience;
                o.AccessTtlMinutes = int.Parse(config["JWT_ACCESS_TTL_MINUTES"] ?? "15");
            })
            .Validate(o => o.Secret.Length >= 32, "JWT_SECRET debe tener al menos 32 caracteres")
            .ValidateOnStart(); // falla al arrancar, no en la primera petición

        services.AddOptions<SmtpOptions>().Configure(o =>
        {
            o.Host = config["SMTP_HOST"] ?? o.Host;
            o.Port = int.Parse(config["SMTP_PORT"] ?? "1025");
            o.From = config["SMTP_FROM"] ?? o.From;
        });

        services.AddOptions<AuthSettings>().Configure(o =>
        {
            o.AppUrl = config["APP_URL"] ?? o.AppUrl;
            o.RefreshTtlDays = int.Parse(config["REFRESH_TTL_DAYS"] ?? "7");
        });

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IRefreshTokenRepository, EfRefreshTokenRepository>();
        services.AddScoped<IOneTimeTokenRepository, EfOneTimeTokenRepository>();
        services.AddSingleton<IPasswordHasher, AspNetPasswordHasher>();
        services.AddSingleton<IAccessTokenIssuer, JwtIssuer>();
        services.AddSingleton<IOpaqueTokens, RandomTokens>();
        services.AddSingleton<IEmailRenderer, EmbeddedEmailRenderer>();
        services.AddScoped<IEmailSender, MailKitEmailSender>();
        return services;
    }

    /// <summary>postgres://usuario:clave@host:puerto/base -> cadena de conexión de Npgsql.</summary>
    public static string ToNpgsql(string url)
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':', 2);
        return $"Host={uri.Host};Port={(uri.Port > 0 ? uri.Port : 5432)};Database={uri.AbsolutePath.TrimStart('/')};" +
               $"Username={Uri.UnescapeDataString(userInfo[0])};Password={(userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "")}";
    }
}
```

<a id="api"></a>

## Api: Program.cs, filtro, manejador de errores y controlador

El filtro de validación. FluentValidation quitó hace tiempo la validación automática para ASP.NET (el paquete `FluentValidation.AspNetCore` está obsoleto), así que escribo un filtro de 30 líneas que busca un validador para cada argumento:

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BaseApi.Api.Infrastructure;

/// <summary>
/// Antes de cada acción busca un IValidator&lt;T&gt; para cada argumento y, si falla,
/// responde 400 con Problem Details y el mapa "errors" (campo -> mensajes).
/// </summary>
public sealed class ValidationFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext ctx, ActionExecutionDelegate next)
    {
        foreach (var arg in ctx.ActionArguments.Values)
        {
            if (arg is null) continue;
            var validatorType = typeof(IValidator<>).MakeGenericType(arg.GetType());
            if (services.GetService(validatorType) is not IValidator validator) continue;

            var result = await validator.ValidateAsync(new ValidationContext<object>(arg), ctx.HttpContext.RequestAborted);
            if (result.IsValid) continue;

            var errors = result.Errors
                .GroupBy(e => char.ToLowerInvariant(e.PropertyName[0]) + e.PropertyName[1..]) // camelCase
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            ctx.Result = new ObjectResult(new ValidationProblemDetails(errors)
            {
                Type = "about:blank",
                Title = "Datos inválidos",
                Status = 400,
                Detail = "Revisa los campos marcados",
            })
            { StatusCode = 400, ContentTypes = { "application/problem+json" } };
            return;
        }
        await next();
    }
}
```

El manejador de errores. `IExceptionHandler` existe desde .NET 8 y es la forma oficial de centralizar excepciones. Lo combino con `IProblemDetailsService` para que la respuesta salga como `application/problem+json`:

```csharp
using BaseApi.Domain;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BaseApi.Api.Infrastructure;

/// <summary>IExceptionHandler (.NET 8+): convierte excepciones en Problem Details (RFC 9457).</summary>
public sealed class DomainExceptionHandler(IProblemDetailsService problems, ILogger<DomainExceptionHandler> log)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
    {
        var (status, title, detail) = ex switch
        {
            DomainException d => d.Kind switch
            {
                DomainErrorKind.Validation => (400, "Datos inválidos", d.Message),
                DomainErrorKind.InvalidToken => (400, "Token inválido", d.Message),
                DomainErrorKind.Conflict => (409, "Conflicto", d.Message),
                DomainErrorKind.Unauthorized => (401, "No autorizado", d.Message),
                DomainErrorKind.Forbidden => (403, "Correo sin verificar", d.Message),
                _ => (500, "Error interno", "Ocurrió un error inesperado"),
            },
            BadHttpRequestException => (400, "Datos inválidos", "El cuerpo de la petición no es JSON válido"),
            _ => (500, "Error interno", "Ocurrió un error inesperado"),
        };
        if (status == 500) log.LogError(ex, "Error no controlado");

        http.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            Exception = ex,
            ProblemDetails = new ProblemDetails { Type = "about:blank", Title = title, Status = status, Detail = detail },
        });
    }
}
```

El controlador, delgado, con `[Authorize]` en las dos rutas protegidas. Para leer el id uso el claim `sub` tal cual, porque en `Program.cs` apago `MapInboundClaims`. Sin eso, ASP.NET renombra `sub` a un URI larguísimo de `ClaimTypes.NameIdentifier`, que es una de las sorpresas más clásicas de JWT en .NET.

```csharp
using System.Security.Claims;
using BaseApi.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace BaseApi.Api.Controllers;

/// <summary>Controlador delgado: recibe, delega en IAuthService y elige el código HTTP.</summary>
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Register(RegisterRequest req, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await auth.RegisterAsync(req, ct));

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(TokenRequest req, CancellationToken ct)
    {
        await auth.VerifyEmailAsync(req, ct);
        return NoContent();
    }

    [HttpPost("login")]
    public Task<TokenPairResponse> Login(LoginRequest req, CancellationToken ct) => auth.LoginAsync(req, ct);

    [HttpPost("refresh")]
    public Task<TokenPairResponse> Refresh(RefreshRequest req, CancellationToken ct) => auth.RefreshAsync(req, ct);

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest req, CancellationToken ct)
    {
        await auth.LogoutAsync(req, ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        await auth.ChangePasswordAsync(CurrentUserId(), req, ct);
        return NoContent();
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(EmailRequest req, CancellationToken ct)
    {
        await auth.ForgotPasswordAsync(req, ct);
        return Accepted();
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req, CancellationToken ct)
    {
        await auth.ResetPasswordAsync(req, ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public Task<UserResponse> Me(CancellationToken ct) => auth.MeAsync(CurrentUserId(), ct);

    // Con MapInboundClaims = false, "sub" llega tal cual (sin renombrarse a NameIdentifier).
    private Guid CurrentUserId() => Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
}
```

Y `Program.cs`. Fíjense en tres cosas:

1. `InvalidModelStateResponseFactory` convierte el JSON mal formado en un 400 con Problem Details. Sin eso, un `{` suelto terminaba en un 500 (me pasó en la primera versión).
2. `ValidAlgorithms = [SecurityAlgorithms.HmacSha256]` es la lista cerrada que rechaza `alg: none`.
3. `OnChallenge` reemplaza el 401 vacío de JwtBearer por uno con Problem Details.

```csharp
using System.Text;
using BaseApi.Api.Infrastructure;
using BaseApi.Application;
using BaseApi.Infrastructure;
using BaseApi.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
builder.WebHost.UseUrls($"http://0.0.0.0:{config["PORT"] ?? "8080"}");

// ---- Capas (composition root) ----
builder.Services.AddApplication();
builder.Services.AddInfrastructure(config);

// ---- API ----
builder.Services.AddControllers(o => o.Filters.Add<ValidationFilter>());
// JSON mal formado o tipos equivocados: [ApiController] responde 400 antes de llegar a la acción.
builder.Services.Configure<ApiBehaviorOptions>(o => o.InvalidModelStateResponseFactory = ctx =>
    new BadRequestObjectResult(new ProblemDetails
    {
        Type = "about:blank", Title = "Datos inválidos", Status = 400, Detail = "El cuerpo de la petición no es válido",
    })
    { ContentTypes = { "application/problem+json" } });
builder.Services.AddProblemDetails(o => o.CustomizeProblemDetails = c => c.ProblemDetails.Extensions.Remove("traceId"));
builder.Services.AddExceptionHandler<DomainExceptionHandler>();

// ---- JWT: solo HS256, y se validan firma, exp, iss y aud ----
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = config["JWT_ISSUER"] ?? "baseapi",
        ValidAudience = config["JWT_AUDIENCE"] ?? "baseapi-clients",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["JWT_SECRET"] ?? "")),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.FromSeconds(30),
    };
    o.Events = new JwtBearerEvents
    {
        OnChallenge = async ctx =>
        {
            ctx.HandleResponse(); // en vez del 401 vacío, Problem Details
            ctx.Response.StatusCode = 401;
            ctx.Response.ContentType = "application/problem+json";
            await ctx.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Type = "about:blank", Title = "No autorizado", Status = 401, Detail = "Falta el token o no es válido",
            }, options: null, contentType: "application/problem+json");
        },
    };
});
builder.Services.AddAuthorization();

// ---- OpenAPI con Swashbuckle (como en BaseApiNetCore10) ----
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo { Title = "Base API", Version = "v1" });
    o.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT",
    });
    o.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", doc)] = [],
    });
});

var app = builder.Build();

// Migraciones al arrancar: cómodo en desarrollo. En producción, mejor un paso aparte del despliegue.
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();

app.UseExceptionHandler();
app.UseSwagger(o => o.RouteTemplate = "openapi/{documentName}.json");
app.UseSwaggerUI(o =>
{
    o.RoutePrefix = "docs";
    o.SwaggerEndpoint("/openapi/v1.json", "Base API v1");
});
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();

public partial class Program; // para WebApplicationFactory en pruebas de integración
```

<a id="migraciones"></a>

## Migraciones con dotnet ef

Genero la migración inicial. `-p` es el proyecto donde vive el `DbContext` y `-s` el proyecto que arranca la app:

```bash
dotnet ef migrations add Init -p src/BaseApi.Infrastructure -s src/BaseApi.Api -o Persistence/Migrations
```

Para revisar qué SQL va a correr, sin tocar la base:

```bash
dotnet ef migrations script -p src/BaseApi.Infrastructure -s src/BaseApi.Api
```

La salida trae las mismas tablas e índices de la introducción, con `ix_refresh_tokens_user` y `ix_one_time_tokens_user` incluidos.

`Program.cs` aplica las migraciones pendientes al arrancar con `MigrateAsync()`. En producción prefiero `dotnet ef database update` o un *migration bundle* como paso aparte del despliegue.

<a id="pruebas"></a>

## Pruebas unitarias con xUnit v3

Las pruebas construyen `AuthService` con dobles en memoria y un `TimeProvider` fijo. No uso ninguna librería de aserciones aparte: `Assert` de xUnit alcanza.

```csharp
using BaseApi.Application.Auth;
using BaseApi.Domain;
using BaseApi.Domain.Ports;
using BaseApi.Domain.Tokens;
using BaseApi.Domain.Users;
using Microsoft.Extensions.Options;

namespace BaseApi.Tests;

/// <summary>Pruebas del caso de uso con dobles en memoria: sin base, sin SMTP, sin ASP.NET.</summary>
public sealed class AuthServiceTests
{
    private sealed class Users : IUserRepository
    {
        public readonly List<User> Rows = [];
        public Task<User?> FindByEmailAsync(Email e, CancellationToken ct) => Task.FromResult(Rows.FirstOrDefault(u => u.Email == e));
        public Task<User?> FindByIdAsync(Guid id, CancellationToken ct) => Task.FromResult(Rows.FirstOrDefault(u => u.Id == id));
        public Task AddAsync(User u, CancellationToken ct) { Rows.Add(u); return Task.CompletedTask; }
        public Task UpdateAsync(User u, CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class Refresh : IRefreshTokenRepository
    {
        public readonly List<RefreshToken> Rows = [];
        public Task AddAsync(RefreshToken t, CancellationToken ct) { Rows.Add(t); return Task.CompletedTask; }
        public Task<RefreshToken?> FindByHashAsync(string h, CancellationToken ct) => Task.FromResult(Rows.FirstOrDefault(t => t.TokenHash == h));
        public Task UpdateAsync(RefreshToken t, CancellationToken ct) => Task.CompletedTask;
        public Task RevokeAllForUserAsync(Guid userId, DateTimeOffset at, CancellationToken ct)
        {
            foreach (var t in Rows.Where(t => t.UserId == userId)) t.Revoke(at);
            return Task.CompletedTask;
        }
    }

    private sealed class Otts : IOneTimeTokenRepository
    {
        private readonly List<OneTimeToken> _rows = [];
        public Task AddAsync(OneTimeToken t, CancellationToken ct) { _rows.Add(t); return Task.CompletedTask; }
        public Task<OneTimeToken?> FindValidAsync(string h, TokenPurpose p, DateTimeOffset now, CancellationToken ct) =>
            Task.FromResult(_rows.FirstOrDefault(t => t.TokenHash == h && t.Purpose == p && t.UsedAt == null && t.ExpiresAt > now));
        public Task UpdateAsync(OneTimeToken t, CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class FakeHasher : IPasswordHasher
    {
        public string Hash(string p) => "h:" + p;
        public bool Verify(string p, string h) => h == "h:" + p;
    }

    private sealed class FakeJwt : IAccessTokenIssuer
    {
        public IssuedAccessToken Issue(User u) => new("jwt-" + u.Id, 900);
    }

    private sealed class FakeTokens : IOpaqueTokens
    {
        private int _n;
        public GeneratedToken Generate() { var v = "tok" + ++_n; return new(v, Hash(v)); }
        public string Hash(string v) => "sha:" + v;
    }

    private sealed class Outbox : IEmailSender, IEmailRenderer
    {
        public readonly List<EmailMessage> Sent = [];
        public Task SendAsync(EmailMessage m, CancellationToken ct) { Sent.Add(m); return Task.CompletedTask; }
        public EmailMessage Render(string tpl, string to, string subject, IReadOnlyDictionary<string, string> d) =>
            new(to, subject, tpl, d.GetValueOrDefault("link") ?? d["message"]);
        public string LastToken() => Sent[^1].Text[(Sent[^1].Text.IndexOf("token=") + 6)..];
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2026, 11, 25, 12, 0, 0, TimeSpan.Zero);
    }

    private readonly Outbox _outbox = new();
    private readonly AuthService _sut;
    private static readonly CancellationToken Ct = CancellationToken.None;

    public AuthServiceTests() =>
        _sut = new AuthService(new Users(), new Refresh(), new Otts(), new FakeHasher(), new FakeJwt(), new FakeTokens(),
            _outbox, _outbox, new FixedClock(), Options.Create(new AuthSettings { AppUrl = "http://front" }));

    private async Task<TokenPairResponse> RegisterVerifyLogin()
    {
        await _sut.RegisterAsync(new RegisterRequest(" Ana@Example.COM ", "secreta123", "Ana"), Ct);
        await _sut.VerifyEmailAsync(new TokenRequest(_outbox.LastToken()), Ct);
        return await _sut.LoginAsync(new LoginRequest("ana@example.com", "secreta123"), Ct);
    }

    [Fact]
    public async Task Register_normaliza_el_correo_y_envia_bienvenida()
    {
        var res = await _sut.RegisterAsync(new RegisterRequest(" Ana@Example.COM ", "secreta123", "Ana"), Ct);
        Assert.Equal("ana@example.com", res.Email);
        Assert.False(res.EmailVerified);
        Assert.Single(_outbox.Sent);
        var dup = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.RegisterAsync(new RegisterRequest("ana@example.com", "otraclave1", "Ana"), Ct));
        Assert.Equal(DomainErrorKind.Conflict, dup.Kind);
    }

    [Fact]
    public async Task Login_exige_correo_verificado()
    {
        await _sut.RegisterAsync(new RegisterRequest("ana@example.com", "secreta123", "Ana"), Ct);
        var ex = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.LoginAsync(new LoginRequest("ana@example.com", "secreta123"), Ct));
        Assert.Equal(DomainErrorKind.Forbidden, ex.Kind);
    }

    [Fact]
    public async Task Reusar_un_refresh_rotado_cierra_todas_las_sesiones()
    {
        var first = await RegisterVerifyLogin();
        var second = await _sut.RefreshAsync(new RefreshRequest(first.RefreshToken), Ct);
        await Assert.ThrowsAsync<DomainException>(() => _sut.RefreshAsync(new RefreshRequest(first.RefreshToken), Ct));
        await Assert.ThrowsAsync<DomainException>(() => _sut.RefreshAsync(new RefreshRequest(second.RefreshToken), Ct));
    }

    [Fact]
    public async Task Olvide_clave_con_correo_desconocido_no_envia_nada()
    {
        await _sut.ForgotPasswordAsync(new EmailRequest("nadie@example.com"), Ct);
        Assert.Empty(_outbox.Sent);
    }
}
```

```bash
dotnet test
```

```text
Test run summary: Passed!
  total: 4
  failed: 0
  succeeded: 4
  skipped: 0
```

<a id="probarlo"></a>

## Probarlo de punta a punta

.NET no lee archivos `.env` por su cuenta. Cargo el `.env` común en la terminal y arranco:

```bash
docker compose up -d
set -a && source ../.env && set +a
dotnet run --project src/BaseApi.Api
```

Pruebo un cuerpo inválido, para ver la validación:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' -d '{"email":"x","password":"1","name":""}'
```

```json
{"type":"about:blank","title":"Datos inválidos","status":400,"detail":"Revisa los campos marcados","errors":{"email":["formato inválido"],"password":["debe tener entre 8 y 72 caracteres"],"name":["es obligatorio","debe tener entre 2 y 100 caracteres"]}}
```

Y el recorrido completo:

```bash
../e2e.sh http://localhost:8080
```

```text
  ✔ logout (204)
  ✔ refresh después de logout (400)
Listo: el contrato se cumple.
```

Swagger UI queda en `http://localhost:8080/docs` y el JSON en `/openapi/v1.json`.

<a id="extender"></a>

## Cómo agrego otro endpoint de punta a punta

Para `POST /resend-verification`:

1. **Contrato y e2e:** la ruta en `openapi.yaml` y el paso en `e2e.sh`.
2. **Interfaz y servicio:** agrego `Task ResendVerificationAsync(EmailRequest req, CancellationToken ct);` a `IAuthService` y la implementación:

```csharp
public async Task ResendVerificationAsync(EmailRequest req, CancellationToken ct)
{
    var user = await users.FindByEmailAsync(Email.Parse(req.Email), ct);
    if (user is null || user.IsVerified) return; // 202 igual
    var token = await CreateOneTimeTokenAsync(user, TokenPurpose.VerifyEmail, TimeSpan.FromHours(24), ct);
    await mailer.SendAsync(emails.Render("welcome-verify", user.Email.Value, "Bienvenido, confirma tu correo",
        new Dictionary<string, string> { ["name"] = user.Name, ["link"] = $"{_settings.AppUrl}/verify-email?token={token}" }), ct);
}
```

3. **Controlador:** el validador `EmailRequestValidator` ya existe, así que el filtro lo usa solo:

```csharp
[HttpPost("resend-verification")]
public async Task<IActionResult> ResendVerification(EmailRequest req, CancellationToken ct)
{
    await auth.ResendVerificationAsync(req, ct);
    return Accepted();
}
```

4. **Prueba** en `AuthServiceTests`.

Si hace falta una columna, la agrego a la entidad y a su configuración, y corro `dotnet ef migrations add NombreDelCambio ...`.

<a id="errores-tipicos"></a>

## Errores típicos y trampas

- **`Testing with VSTest target is no longer supported by Microsoft.Testing.Platform on .NET 10 SDK`.** Falta el bloque `"test": { "runner": "Microsoft.Testing.Platform" }` en `global.json`. Y quiten `Microsoft.NET.Test.Sdk` y `xunit.runner.visualstudio` si los agregaron por costumbre.
- **`cannot convert from 'MimeKit.MimeMessage' to 'MimeKit.FormatOptions'`.** Es MailKit 5: usen `client.SendAsync(new SendRequest(msg), ct)`.
- **`User.FindFirstValue("sub")` devuelve `null`.** Falta `MapInboundClaims = false`.
- **Un 500 con JSON mal formado.** Si apagan `SuppressModelStateInvalidFilter` para validar solo con FluentValidation, el cuerpo inválido llega como `null` al controlador. Mejor dejar el filtro de `[ApiController]` encendido y personalizar su respuesta, como hago aquí.
- **`DateTime` sin UTC y Npgsql.** Npgsql exige UTC para `timestamptz`; con `DateTimeOffset` y `TimeProvider.GetUtcNow()` no hay problema.
- **La transacción por petición** que deshace la revocación por reuso, como conté en la introducción.

<a id="diferencias"></a>

## Dónde el código no coincide con el esquema (ni con el repo)

Contra el esquema ideal:

- **`MigrateAsync()` al arrancar.** Cómodo en desarrollo, peligroso con varias instancias arrancando a la vez.
- **Los repositorios guardan en cada método,** sin unidad de trabajo. `ResetPasswordAsync` hace varias escrituras que no son atómicas.
- **`JwtBearer` y `JwtIssuer` leen el secreto por separado** (uno de `config`, otro de `JwtOptions`). Lo ideal sería que JwtBearer también leyera `JwtOptions`, con `AddOptions<JwtBearerOptions>().Configure<IOptions<JwtOptions>>(...)`.

Contra la plantilla anterior de BaseApiNetCore10, todo lo de la tabla del principio. Esa versión tenía un `RoleController` que aquí no está: los roles son el reto de la entrega de NestJS. El 26 de noviembre de 2026 actualicé [BaseApiNetCore10](https://github.com/FeithNoir/BaseApiNetCore10) con este código. Quien ya usaba la plantilla anterior debería tratarlo como un salto de versión, no como un `git pull` inocente: cambiaron las capas, SQLite por Postgres, y salieron Identity y el `RoleController`. El código anterior quedó en la rama `legacy/2026-02-plantilla-identity-sqlite`.

<a id="checklist"></a>

## Checklist

- [ ] SDK 10 instalado y `global.json` con Microsoft.Testing.Platform.
- [ ] Cuatro proyectos con referencias hacia adentro.
- [ ] Paquetes con las versiones de la tabla, sin AutoMapper ni MediatR.
- [ ] `dotnet ef migrations add Init` generado.
- [ ] `dotnet test` pasa.
- [ ] `.env` cargado y `dotnet run` arriba.
- [ ] `../e2e.sh http://localhost:8080` termina en "el contrato se cumple".

<a id="resumen"></a>

## Resumen

Como acabamos de ver, .NET 10 trae casi todo lo necesario de serie: contenedor de dependencias, `TimeProvider`, `IExceptionHandler`, Problem Details y el validador de JWT. Lo que agregué fue Postgres con EF Core, FluentValidation, MailKit y la disciplina de separar el dominio en su propio proyecto.

Si bien BaseApiNetCore10 me sirvió durante mucho tiempo, esta versión es la que voy a usar de aquí en adelante: mismo contrato que el resto de la serie y sin dependencias que cambiaron de licencia. En la siguiente entrega vamos con [Spring Boot y Spring Security](/post/crear-base-api-spring-boot). ¿Ustedes usan Identity completo o prefieren su propia entidad?

<a id="reto"></a>

## Reto

Para el archivo `src/app/features/challenges/challenges.data.ts`:

```ts
{
  slug: 'crear-base-api-dotnet-bloqueo-de-cuenta',
  title: 'Bloqueo de cuenta tras intentos fallidos en .NET',
  summary: 'Bloquea la cuenta 15 minutos después de cinco contraseñas incorrectas seguidas en la API base de .NET 10.',
  difficulty: 'practice',
  tags: ['dotnet', 'csharp', 'efcore', 'seguridad', 'crear-base-api'],
  language: 'C#',
  articleSlug: 'crear-base-api-dotnet',
  articleTitle: 'Crear base API: .NET 10 con EF Core, FluentValidation y MailKit',
  prompt: 'Agrega a User las propiedades FailedLogins (int) y LockedUntil (DateTimeOffset?), con su migración. En LoginAsync: si la cuenta está bloqueada responde 401 con el mismo mensaje genérico; si la clave falla, suma un intento y al quinto bloquea 15 minutos; si entra bien, reinicia el contador. Escribe una prueba con un TimeProvider que puedas adelantar.',
  hint: 'Pon la lógica en métodos del dominio (RegisterFailedLogin, ResetFailedLogins, IsLocked) para que el servicio siga delgado. Para la prueba, una clase que herede de TimeProvider con un campo Now modificable.',
  solution: `// User.cs
public int FailedLogins { get; private set; }
public DateTimeOffset? LockedUntil { get; private set; }

public bool IsLocked(DateTimeOffset now) => LockedUntil is not null && LockedUntil > now;

public void RegisterFailedLogin(DateTimeOffset now)
{
    FailedLogins++;
    if (FailedLogins >= 5) { LockedUntil = now.AddMinutes(15); FailedLogins = 0; }
    UpdatedAt = now;
}

public void ResetFailedLogins() { FailedLogins = 0; LockedUntil = null; }

// AuthService.LoginAsync
var now = clock.GetUtcNow();
var user = await users.FindByEmailAsync(email, ct);
if (user is null) throw DomainException.InvalidCredentials();
if (user.IsLocked(now)) throw DomainException.InvalidCredentials();
if (!hasher.Verify(req.Password, user.PasswordHash))
{
    user.RegisterFailedLogin(now);
    await users.UpdateAsync(user, ct);
    throw DomainException.InvalidCredentials();
}
user.ResetFailedLogins();
await users.UpdateAsync(user, ct);

// AppDbContext: e.Property(x => x.FailedLogins).HasColumnName("failed_logins");
//               e.Property(x => x.LockedUntil).HasColumnName("locked_until");
// dotnet ef migrations add AccountLockout -p src/BaseApi.Infrastructure -s src/BaseApi.Api`,
},
```
