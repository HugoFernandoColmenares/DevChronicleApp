---
title: "Cómo escribir PHP 8.3 tipado y moderno (tipos, enums, readonly y constructor promotion)"
author: Hugo Colmenares
date: 2026-11-23
category: Tutoriales
series: Laravel y PHP moderno
tags: [php, tipos, enums, composer, phpunit, laravel]
excerpt: "Una clase pequeña de dominio —un estudiante de dojo con grado y fecha de examen— para aprender PHP 8.3+ tipado: strict types, enums, readonly, constructor promotion y TypeError tempranos."
status: published
---

Hoy vamos a ver cómo escribir PHP moderno y tipado, el mismo dialecto que pide un Laravel actual. No vamos a armar una aplicación completa. Vamos a construir una clase pequeña de dominio: un estudiante de dojo, con su grado (kyu o dan) y una fecha de examen. Con eso alcanza para practicar `declare(strict_types=1)`, propiedades tipadas, *constructor property promotion*, `readonly`, enums y los `TypeError` que aparecen temprano cuando algo entra mal.

Este es el primer tutorial de la serie **Laravel y PHP moderno**. La serie es una ruta de aprendizaje, no la bitácora de un producto ya publicado. El código vive en este artículo, archivo por archivo. Lo corrí el 23 de noviembre de 2026 en PHP 8.4.28 y Composer 2.11.2, con PHPUnit 12.5.45. Si ustedes lo corren en PHP 8.3, el mismo código sirve: todo lo que uso aquí existe desde 8.3 (y casi todo, desde 8.1). Laravel 13, que es la versión actual al escribir esto, pide PHP 8.3 como mínimo.

Más adelante, esta misma idea de tipos se aplica en [Seiryuko Tatami](/post/fullstack-laravel-inertia-react-typescript-tailwind) y en el resto de la serie. El reto de puesta a prueba no va en este artículo: está en la sección [Desafíos](/challenges/tipar-dto-check-in-asistencia).

<a id="contenido"></a>

## Contenido

1. [Qué vamos a construir](/post/php-8-3-tipado-moderno-tipos-enums-readonly#que-vamos-a-construir)
2. [Prerrequisitos](/post/php-8-3-tipado-moderno-tipos-enums-readonly#prerrequisitos)
3. [Instalación](/post/php-8-3-tipado-moderno-tipos-enums-readonly#instalacion)
4. [Carpetas y responsabilidad](/post/php-8-3-tipado-moderno-tipos-enums-readonly#carpetas)
5. [Paso a paso: strict types, promotion, readonly, enum y value object](/post/php-8-3-tipado-moderno-tipos-enums-readonly#paso-a-paso)
6. [Cómo probarlo](/post/php-8-3-tipado-moderno-tipos-enums-readonly#probarlo)
7. [Cómo agrego otro value object de punta a punta](/post/php-8-3-tipado-moderno-tipos-enums-readonly#extender)
8. [Errores típicos y trampas](/post/php-8-3-tipado-moderno-tipos-enums-readonly#errores)
9. [Checklist](/post/php-8-3-tipado-moderno-tipos-enums-readonly#checklist)
10. [Resumen](/post/php-8-3-tipado-moderno-tipos-enums-readonly#resumen)

<a id="que-vamos-a-construir"></a>

## Qué vamos a construir

Un paquete mínimo llamado `dojo-tipos`. No es un Laravel todavía. Es un proyecto de Composer con tres clases:

- `Grado`, un enum con los kyu y los dan que uso en el ejemplo.
- `FechaExamen`, un *value object* `readonly`: o la fecha es válida y no está en el pasado, o no se crea el objeto.
- `Estudiante`, con *constructor property promotion*: un identificador inmutable, un nombre, un grado y, si hay, la fecha del próximo examen.

Si vienen de TypeScript o de C#, la idea les va a sonar. Un enum no es un string mágico. Un value object no es un `string $fecha` suelto. Y `strict_types` es el primo de `"strict": true` en el `tsconfig`: el lenguaje deja de adivinar y nos avisa.

El flujo es sencillo:

1. Creamos un `Estudiante` con un `Grado`.
2. Si hay examen, le pasamos una `FechaExamen`.
3. Pedimos un `resumen()` en texto, listo para imprimir en la terminal.

<a id="prerrequisitos"></a>

## Prerrequisitos

Necesitan esto antes de copiar el primer archivo:

- PHP 8.3 o 8.4 en la máquina. Yo usé **PHP 8.4.28** (el de Debian el día que escribí esto).
- Composer 2. La versión que corrí es **2.11.2**.
- Un editor que lea tipos. El que ya usen sirve.

Para comprobar las versiones:

```bash
php -v
composer -V
```

La primera línea de `php -v` me dio esto:

```text
PHP 8.4.28 (cli) (built: Nov 18 2026 10:55:31) (NTS)
```

Y Composer respondió:

```text
Composer version 2.11.2 2026-11-10 10:09:37
PHP version 8.4.28 (/usr/bin/php8.4)
```

Si `php -v` dice 8.2 o menos, este código no va a arrancar como está. Laravel 13 tampoco: pide 8.3 como mínimo. En Linux, el paquete `php8.4-cli` (o `php8.3-cli`) alcanza para este tutorial. Todavía no hace falta MySQL, Redis ni Docker.

<a id="instalacion"></a>

## Instalación

Creo la carpeta del proyecto y dejo que Composer escriba el `composer.json`. El `--name` evita la pregunta interactiva. El `--autoload` PSR-4 le dice a Composer que las clases de `src/` viven en el espacio de nombres `Seiryuko\DojoTipos`.

```bash
mkdir dojo-tipos && cd dojo-tipos
composer init --no-interaction \
  --name seiryuko/dojo-tipos \
  --description "Ejemplo mínimo de PHP 8.3+ tipado" \
  --type project \
  --require "php:^8.3" \
  --autoload "Seiryuko\\DojoTipos\\=src/"
```

¿Por qué `php:^8.3` y no `^8.4`? Porque el lenguaje que estamos practicando ya está completo en 8.3, y Laravel 13 acepta 8.3 a 8.5. Si ustedes están en 8.4, como yo, el techo `^8.3` los deja pasar igual.

Instalo PHPUnit 12 solo como dependencia de desarrollo, para el test mínimo del final:

```bash
composer require --dev phpunit/phpunit:^12.4 --no-interaction
```

Eso me dejó **PHPUnit 12.5.45**. Después de instalar, Composer genera `vendor/autoload.php`. Sin ese archivo, el script de la terminal no encuentra las clases.

Si `composer init` ya escribió el autoload, comprueben que el `composer.json` quede más o menos así. El bloque `autoload-dev` lo agrego a mano para los tests:

```json
{
  "name": "seiryuko/dojo-tipos",
  "description": "Ejemplo mínimo de PHP 8.3+ tipado para el tutorial de DevChronicle.",
  "type": "project",
  "require": {
    "php": "^8.3"
  },
  "require-dev": {
    "phpunit/phpunit": "^12.4"
  },
  "autoload": {
    "psr-4": {
      "Seiryuko\\DojoTipos\\": "src/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "Seiryuko\\DojoTipos\\Tests\\": "tests/"
    }
  }
}
```

Si editan el autoload a mano, regeneren el archivo:

```bash
composer dump-autoload
```

<a id="carpetas"></a>

## Carpetas y responsabilidad

El árbol queda así:

```text
dojo-tipos/
├── bin/demo.php
├── composer.json
├── phpunit.xml
├── src/
│   ├── Estudiante.php
│   ├── FechaExamen.php
│   └── Grado.php
├── tests/
│   └── EstudianteTest.php
└── vendor/
```

- `src/Grado.php` es el vocabulario del dominio: no hay `'3k'` suelto en el resto del código.
- `src/FechaExamen.php` valida la fecha una sola vez, en el constructor.
- `src/Estudiante.php` arma el estudiante y sabe resumirlo. No parsea fechas ni interpreta códigos de grado.
- `bin/demo.php` es un script de terminal para ver el objeto vivo.
- `tests/EstudianteTest.php` cubre el caso feliz, el nombre vacío, la fecha pasada y el `TypeError` cuando el grado no es un enum.
- `vendor/` no se edita y no se sube al repositorio.

Eso es KISS y un poco de SOLID en miniatura: cada clase tiene una razón para cambiar. Si mañana el dojo agrega un 4.º dan, toco el enum, no el estudiante.

<a id="paso-a-paso"></a>

## Paso a paso: strict types, promotion, readonly, enum y value object

### Por qué `declare(strict_types=1)` va en cada archivo

En PHP, los tipos de los parámetros existen incluso sin esa línea. Lo que cambia es la **coerción**. Sin `strict_types`, una función que pide `int` acepta la cadena `"2"` y la convierte en `2`. Con la declaración, lanza un `TypeError` en el acto.

Lo comprobé con dos archivos de una función `suma(int $a, int $b): int`. Sin `declare(strict_types=1)`, esto imprime `5` y sigue como si nada:

```php
<?php
function suma(int $a, int $b): int { return $a + $b; }
echo suma("2", "3"), PHP_EOL;
```

Con la declaración, el mismo llamado se cae:

```text
PHP Fatal error:  Uncaught TypeError: suma(): Argument #1 ($a) must be of type int, string given, called in /tmp/con-strict.php on line 4 and defined in /tmp/con-strict.php:3
```

Esa es la diferencia que me interesa. Un `mixed` que se cuela, o un JSON que llega como string, no debería convertirse en silencio dentro del dominio. La declaración es por archivo, no por proyecto: hay que ponerla arriba de cada `.php` que escribamos. Laravel la trae en los archivos nuevos; si ustedes crean un archivo a mano y se les olvida, vuelven a la coerción.

### El enum de kyu y dan

Un enum con *backed values* (`enum Grado: string`) nos deja guardar `'3k'` en una base de datos o en un JSON, y trabajar en PHP con `Grado::TercerKyu`. El `match` del método `etiqueta()` es exhaustivo: si mañana agrego un caso y se me olvida la etiqueta, PHP me avisa.

```php
<?php

declare(strict_types=1);

namespace Seiryuko\DojoTipos;

enum Grado: string
{
    case SeptimoKyu = '7k';
    case SextoKyu = '6k';
    case QuintoKyu = '5k';
    case CuartoKyu = '4k';
    case TercerKyu = '3k';
    case SegundoKyu = '2k';
    case PrimerKyu = '1k';
    case PrimerDan = '1d';
    case SegundoDan = '2d';
    case TercerDan = '3d';

    public function esDan(): bool
    {
        return str_ends_with($this->value, 'd');
    }

    public function etiqueta(): string
    {
        return match ($this) {
            self::SeptimoKyu => '7.º kyu',
            self::SextoKyu => '6.º kyu',
            self::QuintoKyu => '5.º kyu',
            self::CuartoKyu => '4.º kyu',
            self::TercerKyu => '3.º kyu',
            self::SegundoKyu => '2.º kyu',
            self::PrimerKyu => '1.º kyu',
            self::PrimerDan => '1.º dan',
            self::SegundoDan => '2.º dan',
            self::TercerDan => '3.º dan',
        };
    }
}
```

Para reconstruir el enum desde un valor guardado, se usa `Grado::from('3k')`. Si el valor no existe, lanza `ValueError`. Si prefieren no lanzar, `Grado::tryFrom('3k')` devuelve el caso o `null`.

### El value object de la fecha

`FechaExamen` es `final readonly class`. *Readonly* en la clase (desde PHP 8.2) hace que todas las propiedades sean de solo lectura. No puedo crear la fecha y después cambiarle el día a escondidas. El constructor recibe un `DateTimeImmutable` y rechaza el pasado. El método estático `desdeIso` es la puerta de entrada desde un string `YYYY-MM-DD`.

```php
<?php

declare(strict_types=1);

namespace Seiryuko\DojoTipos;

use DateTimeImmutable;
use InvalidArgumentException;

final readonly class FechaExamen
{
    public function __construct(public DateTimeImmutable $valor)
    {
        $hoy = new DateTimeImmutable('today');
        if ($this->valor < $hoy) {
            throw new InvalidArgumentException('La fecha de examen no puede estar en el pasado.');
        }
    }

    public static function desdeIso(string $fecha): self
    {
        $valor = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
        if ($valor === false || $valor->format('Y-m-d') !== $fecha) {
            throw new InvalidArgumentException("Fecha inválida: {$fecha}");
        }

        return new self($valor);
    }

    public function iso(): string
    {
        return $this->valor->format('Y-m-d');
    }
}
```

El `!` delante del formato le dice a PHP que deje el tiempo en cero. La comparación `$valor->format('Y-m-d') !== $fecha` evita que `2026-13-40` se «arregle» sola. Si la fecha no existe, no hay objeto. Esa es la idea del value object: o es válido, o no nació.

### El estudiante, con constructor property promotion

*Constructor property promotion* (desde PHP 8.0, y con `readonly` en propiedades sueltas desde 8.1) nos evita repetir el mismo campo tres veces: declaración, parámetro y asignación. Lo escribo una vez en el constructor. `id` es `readonly` porque no debería cambiar. `nombre` y `grado` sí pueden actualizarse después. `proximoExamen` admite `null` con un *union type* `?FechaExamen`.

```php
<?php

declare(strict_types=1);

namespace Seiryuko\DojoTipos;

use InvalidArgumentException;

final class Estudiante
{
    public function __construct(
        public readonly string $id,
        public string $nombre,
        public Grado $grado,
        public ?FechaExamen $proximoExamen = null,
    ) {
        $nombre = trim($nombre);
        if ($nombre === '') {
            throw new InvalidArgumentException('El nombre no puede quedar vacío.');
        }
        $this->nombre = $nombre;
    }

    public function programarExamen(FechaExamen $fecha): void
    {
        $this->proximoExamen = $fecha;
    }

    public function resumen(): string
    {
        $examen = $this->proximoExamen?->iso() ?? 'sin fecha';

        return "{$this->nombre} ({$this->grado->etiqueta()}), examen: {$examen}";
    }
}
```

Fíjense en el `?->`: si no hay fecha, no llamo a `iso()`. El *nullsafe operator* y el `??` se leen bien juntos. Y `Grado $grado` no es un string: si alguien pasa `'3k'`, PHP lanza `TypeError` antes de que el objeto exista.

Hay un detalle con las propiedades promovidas: puedo validar y reasignar `$this->nombre` en el cuerpo del constructor, pero no puedo reasignar una propiedad `readonly` después de que el constructor termina. Por eso el `id` entra ya listo.

<a id="probarlo"></a>

## Cómo probarlo

Primero, un script de terminal. Lo dejo en `bin/demo.php`:

```php
<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Seiryuko\DojoTipos\Estudiante;
use Seiryuko\DojoTipos\FechaExamen;
use Seiryuko\DojoTipos\Grado;

$estudiante = new Estudiante('est-01', 'Ana Rojas', Grado::TercerKyu);
$estudiante->programarExamen(FechaExamen::desdeIso('2026-12-15'));

echo $estudiante->resumen() . PHP_EOL;
echo '¿Es dan? ' . ($estudiante->grado->esDan() ? 'sí' : 'no') . PHP_EOL;
```

Lo corro así:

```bash
php bin/demo.php
```

La salida, el 23 de noviembre de 2026, fue exactamente esta:

```text
Ana Rojas (3.º kyu), examen: 2026-12-15
¿Es dan? no
```

Si cambian la fecha a un día que ya pasó, el constructor de `FechaExamen` lanza `InvalidArgumentException`. Si pasan un string donde va el enum, el error es otro. Lo disparé a propósito:

```bash
php -r '
require "vendor/autoload.php";
use Seiryuko\DojoTipos\Estudiante;
new Estudiante("est-03", "Luis", "3k");
'
```

Y PHP respondió:

```text
Seiryuko\DojoTipos\Estudiante::__construct(): Argument #3 ($grado) must be of type Seiryuko\DojoTipos\Grado, string given, called in Command line code on line 5
```

Eso es lo que quiero ver: el tipo incorrecto no llega a guardarse. El editor también lo pesca, pero el runtime es la red que no depende de que alguien mire el subrayado amarillo.

Ahora el test. Un `phpunit.xml` mínimo:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         colors="true"
         cacheDirectory=".phpunit.cache">
  <testsuites>
    <testsuite name="dojo-tipos">
      <directory>tests</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

Y el test en `tests/EstudianteTest.php`:

```php
<?php

declare(strict_types=1);

namespace Seiryuko\DojoTipos\Tests;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Seiryuko\DojoTipos\Estudiante;
use Seiryuko\DojoTipos\FechaExamen;
use Seiryuko\DojoTipos\Grado;
use TypeError;

final class EstudianteTest extends TestCase
{
    public function test_crea_un_estudiante_con_grado_y_fecha(): void
    {
        $estudiante = new Estudiante(
            'est-01',
            'Ana Rojas',
            Grado::TercerKyu,
            FechaExamen::desdeIso('2026-12-15'),
        );

        $this->assertSame(
            'Ana Rojas (3.º kyu), examen: 2026-12-15',
            $estudiante->resumen(),
        );
    }

    public function test_rechaza_un_nombre_vacio(): void
    {
        $this->expectException(InvalidArgumentException::class);
        new Estudiante('est-02', '   ', Grado::SeptimoKyu);
    }

    public function test_rechaza_una_fecha_pasada(): void
    {
        $this->expectException(InvalidArgumentException::class);
        FechaExamen::desdeIso('2020-01-01');
    }

    public function test_lanza_type_error_si_el_grado_no_es_un_enum(): void
    {
        $this->expectException(TypeError::class);
        // El tercer argumento va mal a propósito: un string donde corresponde Grado.
        new Estudiante('est-03', 'Luis', '3k');
    }
}
```

```bash
vendor/bin/phpunit --colors=never
```

La salida que me dio esta corrida:

```text
PHPUnit 12.5.45 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.4.28

....                                                                4 / 4 (100%)

Time: 00:00.001, Memory: 14.00 MB

OK (4 tests, 4 assertions)
```

Cuatro pruebas, cuatro aserciones. El caso del `TypeError` es el que más me interesa enseñar: no es un fallo del test, es el lenguaje haciendo su trabajo.

En el [siguiente tutorial](/post/testear-laravel-con-pest-unitarias-feature-autorizacion) pasamos estas ideas a Pest, ya dentro de Laravel. Aquí PHPUnit alcanza, y no meto un framework de pruebas que todavía no hemos instalado en una app Laravel.

<a id="extender"></a>

## Cómo agrego otro value object de punta a punta

Digamos que el dojo también quiere un correo de contacto, y no queremos un `string $email` suelto. El recorrido es el mismo que con la fecha:

1. Creo `src/Correo.php` como `final readonly class`, con `declare(strict_types=1)`.
2. El constructor valida con `filter_var($correo, FILTER_VALIDATE_EMAIL)` y lanza `InvalidArgumentException` si no sirve.
3. Agrego `public Correo $correo` (o `?Correo $correo = null`) al constructor de `Estudiante`.
4. Extiendo `resumen()` solo si hace falta mostrarlo.
5. Agrego un test que rechace `"no-es-un-correo"` y otro que acepte `"ana@dojo.local"`.
6. Corro `vendor/bin/phpunit`.

No toco `Grado`. No parseo el correo en `Estudiante`. Si la regla cambia (por ejemplo, solo correos del dominio del dojo), cambio un archivo.

<a id="errores"></a>

## Errores típicos y trampas

**Olvidar `declare(strict_types=1)`.** El archivo compila. Los tests felices pasan. Y un `"2"` se convierte en `2` sin hacer ruido. Se ve, como en el ejemplo de `suma`, cuando uno lo busca. La costumbre es ponerlo en el primer renglón de cada archivo, no «en el proyecto».

**Un `mixed` (o un `array $data`) que se cuela.** El tipo está, pero no dice nada. Si el check-in de asistencia llega como un arreglo sin forma, el dominio no se enteró de nada. El reto de esta entrega precisamente pide lo contrario: un DTO con forma.

**Confiar solo en el editor.** El editor pesca muchos `TypeError` antes de correr el código. El runtime pesca los que el editor no ve, sobre todo cuando el valor viene de un JSON, de `$_GET` o de una fila de la base. Por eso el test del tercer argumento en string no es caprichoso.

**`readonly` mal colocado.** Si pongo `readonly` en `nombre` y después quiero corregir un typo, no puedo. Si pongo la clase entera como `readonly` y además quiero un método que cambie el grado, tampoco. `FechaExamen` sí es inmutable. `Estudiante` no del todo: el grado y la fecha de examen cambian con la vida del dojo.

**Usar `Grado::from()` sin atrapar el `ValueError`.** Un `'8k'` que venga de un formulario tumba la petición. En el borde (el formulario, el JSON) uso `tryFrom` o valido antes. Dentro del dominio, ya debería llegar un enum.

**Creer que el namespace y la carpeta coinciden «solos».** Si la clase está en `src/Grado.php` pero el `composer.json` no tiene el PSR-4, o no corrieron `composer dump-autoload`, PHP dice que no encuentra la clase. No es un error de tipos. Es el autoload.

<a id="checklist"></a>

## Checklist

- [ ] `php -v` muestra 8.3 o 8.4.
- [ ] `composer -V` responde sin error.
- [ ] Cada archivo propio empieza con `declare(strict_types=1);`.
- [ ] El grado es un enum, no un string suelto.
- [ ] La fecha de examen es un value object `readonly`, no un `string $fecha`.
- [ ] `Estudiante` usa *constructor property promotion*.
- [ ] `php bin/demo.php` imprime el resumen.
- [ ] `vendor/bin/phpunit` deja 4 tests en verde, incluido el `TypeError`.
- [ ] El reto de esta entrega lo resuelvo en [Desafíos: tipar un DTO de check-in](/challenges/tipar-dto-check-in-asistencia), no aquí.

<a id="resumen"></a>

## Resumen

Como acabamos de ver, PHP 8.3+ ya no se escribe como el PHP de hace unos años. Con `strict_types`, enums, `readonly` y *constructor promotion* podemos modelar un rincón pequeño del dojo —un estudiante, un grado, una fecha— y enterarnos temprano cuando algo entra con la forma equivocada.

Esto no reemplaza a Laravel. Es el piso. En el [siguiente artículo](/post/modelar-relaciones-eloquent-y-cazar-el-n-plus-1) esas mismas ideas se sientan en Eloquent, que es el primo de Entity Framework, y aprendemos a cazar el problema N+1. El ejercicio para la mano está en los [desafíos](/challenges/tipar-dto-check-in-asistencia): tipar el DTO de un check-in de asistencia, sin un `array $data` sin forma.
