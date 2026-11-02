---
title: Construyendo APIs por capas: NestJS
author: Hugo Colmenares
date: 2026-11-04
series: Construyendo APIs por capas
tags: [construyendo-apis-por-capas, nestjs, arquitectura]
excerpt: Un módulo NestJS 10 de productos en memoria, y el corte siguiente hacia repositorio, DTOs por uso y un guard de JWT.
---

Tercera entrega de **Construyendo APIs por capas**. En [.NET 10](/post/construyendo-apis-por-capas-dotnet) separé la plantilla en cuatro proyectos. En [Spring Boot](/post/construyendo-apis-por-capas-spring) las mismas cuatro partes son paquetes de un solo módulo Maven. Aquí el código real es más chico: un recurso de productos en [NestJS-Products](https://github.com/HugoFernandoColmenares/NestJS-Products), NestJS 10, arreglo en memoria, DTOs con `class-validator`, configuración con Joi y el prefijo global `api`.

Ese repositorio no tiene cuatro capas, ni base de datos, ni JWT. La primera mitad de esta guía lo arma tal cual está. La segunda mitad, marcada como evolución, es el corte al que lo muevo cuando el arreglo se queda corto: entidad de dominio, un contrato de repositorio, tres implementaciones detrás de un token (memoria, TypeORM y Prisma), un servicio de aplicación, DTOs partidos por uso, un guard de JWT y un filtro global de errores. Ese código no está en el repo. Lo escribo aquí para no mezclar lo que compilé con lo que todavía no.

<a id="contenido"></a>

## Contenido

1. [Prerrequisitos](/post/construyendo-apis-por-capas-nestjs#prerrequisitos)
2. [Qué hay en el repositorio](/post/construyendo-apis-por-capas-nestjs#que-hay)
3. [CLI, paquetes y versiones](/post/construyendo-apis-por-capas-nestjs#instalar)
4. [Carpetas del módulo real](/post/construyendo-apis-por-capas-nestjs#carpetas)
5. [SOLID, DRY y KISS en este módulo](/post/construyendo-apis-por-capas-nestjs#solid)
6. [Por qué todavía no son cuatro partes](/post/construyendo-apis-por-capas-nestjs#cuatro-partes)
7. [Entidad y convención de nombres](/post/construyendo-apis-por-capas-nestjs#entidad)
8. [DTOs, PartialType y el pipe](/post/construyendo-apis-por-capas-nestjs#dtos)
9. [El servicio es el almacén](/post/construyendo-apis-por-capas-nestjs#servicio)
10. [Joi, el puerto y el prefijo](/post/construyendo-apis-por-capas-nestjs#entorno)
11. [Rutas y curl](/post/construyendo-apis-por-capas-nestjs#api)
12. [Cómo agrego otro recurso en este corte](/post/construyendo-apis-por-capas-nestjs#otro-recurso)
13. [Dónde el código no coincide con el esquema](/post/construyendo-apis-por-capas-nestjs#diferencias)
14. [Evolución: dominio, repositorio y token](/post/construyendo-apis-por-capas-nestjs#evolucion-repo)
15. [Evolución: DTOs por uso](/post/construyendo-apis-por-capas-nestjs#evolucion-dtos)
16. [Evolución: JWT, hash y filtro](/post/construyendo-apis-por-capas-nestjs#evolucion-jwt)
17. [Checklist](/post/construyendo-apis-por-capas-nestjs#checklist)
18. [Resumen](/post/construyendo-apis-por-capas-nestjs#resumen)

<a id="prerrequisitos"></a>

## Prerrequisitos

- Node.js 20. El `package.json` fija `@types/node` en `^20.3.1`. NestJS 10 es la línea del repo (`@nestjs/common`, `@nestjs/core` y `@nestjs/platform-express` en `^10.0.0`).
- npm. El CLI del repo está en `^10.0.0`.
- `curl`.
- Nada de base de datos para la primera mitad. El arreglo muere con el proceso.

Compruebo el runtime y dejo el CLI en la major 10, que es la del repo. No fijo un parche que el `package.json` no fija.

```bash
node -v
npm -v
npm install -g @nestjs/cli@10
nest --version
```

<a id="que-hay"></a>

## Qué hay en el repositorio

El proyecto se llama `products`, versión `0.0.1`, licencia `UNLICENSED`. Un `AppModule` importa un solo `ProductsModule`. El servicio guarda `Product[]` en un campo privado. No hay `TypeOrmModule`, ni Prisma, ni `JwtModule`, ni Swagger, ni un filtro de excepciones propio. El 404 sale de `NotFoundException`.

El alta, como está escrita:

```mermaid
sequenceDiagram
  participant C as Cliente
  participant P as ValidationPipe
  participant K as ProductsController
  participant S as ProductsService
  C->>P: POST /api/products
  P->>P: whitelist y class-validator
  P->>K: CreateProductDto
  K->>S: create(dto)
  S->>S: uuid y new Product
  S-->>C: el objeto en el arreglo
```

No hay una flecha hacia una base. Si reinicias `nest start`, la lista vuelve a `[]`.

<a id="instalar"></a>

## CLI, paquetes y versiones

Creo el proyecto con el CLI 10. `--package-manager npm` evita la pregunta del gestor. `--skip-git` deja el git para cuando yo quiera el primer commit.

```bash
nest new products --package-manager npm --skip-git
cd products
```

Si el CLI igual pregunta el lenguaje, elige TypeScript. El `nest-cli.json` del repo queda así:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

`nest new` ya trae `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata` `^0.2.0`, `rxjs` `^7.8.1` y el CLI local `^10.0.0`. Encima instalo lo que el `package.json` de productos agrega, en las versiones que declara:

```bash
npm install class-validator@0.14.1 class-transformer@0.5.1 dotenv@16.4.5 joi@17.13.3 uuid@11.0.2 @nestjs/mapped-types@2
```

El repo deja `@nestjs/mapped-types` en `*`. Yo pido la major 2, que es la que exporta `PartialType` junto a Nest 10. El resto va fijado: `class-validator` 0.14.1, `class-transformer` 0.5.1, `dotenv` 16.4.5, `joi` 17.13.3, `uuid` 11.0.2. TypeScript del repo es `^5.1.3`. Jest es `^29.5.0`, `ts-jest` `^29.1.0`, `supertest` `^6.3.3`. No hace falta reinstalarlos: `nest new` ya los trae en esa línea.

`uuid` 11 es ESM. El servicio importa `import { v4 as UuidV4 } from 'uuid'`. El `tsconfig` que genera Nest 10 compila a CommonJS. Si al arrancar ves `ERR_REQUIRE_ESM`, el paquete 11 no se deja `require`. En ese caso bajo a `uuid@9.0.1`, que sí resuelve ese import bajo CommonJS, y dejo el resto del servicio igual. El repo declara la 11. Lo anoto para que el primer `start` no te deje pensando que el DTO está mal.

Genero el esqueleto sin specs. El volcado del repo no trae `*.spec.ts`.

```bash
nest g module products
nest g controller products --no-spec
nest g service products --no-spec
mkdir -p src/products/dto src/products/entities src/config
```

`nest g resource products` también sirve, y en el CLI 10 pregunta si quieres REST y los endpoints CRUD. Las tres líneas de arriba no preguntan y dejan los mismos archivos.

Scripts que ya vienen y uso:

```bash
npm run start:dev
npm run build
npm test
```

`start:dev` es `nest start --watch`. `build` es `nest build` y, con `deleteOutDir`, vacía `dist` antes de compilar. Producción es `npm run start:prod`, que ejecuta `node dist/main`.

<a id="carpetas"></a>

## Carpetas del módulo real

```text
src/
  main.ts
  app.module.ts
  config/envs.ts
  products/
    products.module.ts
    products.controller.ts
    products.service.ts
    dto/create-product.dto.ts
    dto/update-product.dto.ts
    entities/product.entity.ts
```

`AppModule` solo importa el módulo de productos. El comentario `// Hola mundo` está en el archivo, debajo de la clase. No registra providers globales.

```ts
import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

`ProductsModule` declara el controlador y el servicio. No exporta el servicio. Otro módulo no puede inyectarlo. Hoy no hay otro módulo, así que no duele.

```ts
@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```

Eso es todo el grafo. Nest arma el contenedor desde esos dos arreglos. No hay `useClass`, ni token, ni `forRoot`.

<a id="solid"></a>

## SOLID, DRY y KISS en este módulo

**S.** El controlador traduce HTTP. El servicio decide el id, busca en el arreglo y lanza `NotFoundException`. El DTO declara qué campos acepto. `envs.ts` solo valida el puerto. Si mañana cambio el texto del 404, no abro el controlador.

**O.** Un recurso nuevo es otro módulo. No meto categorías dentro de `ProductsService` con un `if`.

**L.** Aquí casi no hay sustitución. `ProductsService` es una clase concreta y el controlador la pide por ese tipo. No hay una segunda implementación que pueda ocupar su lugar. El hueco está en la evolución, con el token del repositorio.

**I.** `CreateProductDto` no incluye `id`. `UpdateProductDto` hereda los mismos campos hechos opcionales y suma un `id` opcional. No hay un DTO gigante con los cinco verbos.

**D.** El controlador no hace `new ProductsService()`. Lo recibe por el constructor y Nest lo inyecta. El servicio, en cambio, sí es dueño del arreglo: `private products: Product[] = []`. Depende de un detalle de memoria, no de un contrato. Para un taller de un recurso, lo acepto. No lo acepto cuando aparece la segunda forma de guardar.

**DRY.** `findOne` es el único sitio que traduce “no está” en `NotFoundException`. `update` y `remove` lo llaman. `PartialType(CreateProductDto)` evita copiar `name`, `description` y `price` con `@IsOptional` a mano. El `ValidationPipe` se registra una vez en `main.ts`, no en cada método.

**KISS.** Un arreglo, un prefijo, un pipe, una variable `PORT`. No hay Swagger, ni paginación, ni soft delete, ni roles. El precio no tiene mínimo. Una descripción puede faltar. El proceso es la base de datos. Cuando reinicio, los productos se van, y eso es el diseño, no un bug escondido.

<a id="cuatro-partes"></a>

## Por qué todavía no son cuatro partes

```mermaid
flowchart TB
  Api["main.ts + ProductsController<br/>prefijo, pipe, rutas"]
  Business["ProductsService<br/>reglas y también el arreglo"]
  Core["Product + DTOs<br/>en el mismo feature"]
  Api --> Business
  Business --> Core
  Api --> Core
```

| Parte que uso en .NET | En este Nest | Qué hace de verdad |
| :--- | :--- | :--- |
| Api | `main.ts` y `ProductsController` | Prefijo `api`, pipe, verbos |
| Business | `ProductsService` | Crea el uuid, actualiza, borra |
| Data | No existe | El arreglo vive dentro del servicio |
| Core | `entities/` y `dto/` del mismo feature | No es un proyecto aparte |

En .NET, Data no conoce el controlador y el repositorio no devuelve DTOs. Aquí el servicio recibe `CreateProductDto` y devuelve `Product`. El DTO cruzó hasta la capa que guarda. En la pastelería Java el servicio mapea y el repositorio habla SQL. Aquí no hay esa frontera porque no hay SQL.

El módulo de Nest es el límite de compilación que sí tengo: `ProductsModule` agrupa controlador, servicio y, por las carpetas, entidad y DTOs. Es un feature, no cuatro librerías. Me sirve mientras el recurso cabe en un archivo de servicio. Deja de servirme cuando quiero probar el caso de uso sin el arreglo, o guardar en SQLite sin tocar `create()`.

<a id="entidad"></a>

## Entidad y convención de nombres

La convención de la serie, y el nombre que este repo usa.

| Pieza | Convención | En NestJS-Products |
| :--- | :--- | :--- |
| Entidad | PascalCase, un archivo | `Product` en `entities/product.entity.ts` |
| Clave | `Id` en .NET, `guid` en la API Java | `id: string`, un uuid v4 |
| DTO de alta | `Create{Entidad}Dto` | `CreateProductDto` |
| DTO de edición | campos parciales | `UpdateProductDto extends PartialType(CreateProductDto)` |
| DTO de listado y de detalle | distintos | No existen. La lista y el detalle devuelven `Product` |
| DTO de borrado | no lo uso | El id va en la ruta |
| Servicio | interfaz + clase | Solo `ProductsService` |
| Repositorio | interfaz | No hay. El servicio tiene el arreglo |
| Ruta | plural, minúscula | `products`, con prefijo global `api` |
| Borrado | lógico en la pastelería .NET | `filter` saca el objeto del arreglo y lo devuelve |

La entidad es una clase con parámetros de constructor públicos. Las propiedades comentadas arriba del constructor son el borrador anterior. El método `updateWith` copia solo lo que viene definido.

```ts
interface UpdateWithOptions {
  name?: string;
  description?: string;
  price?: number;
}

export class Product {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public price: number,
  ) {}

  updateWith({ name, description, price }: UpdateWithOptions) {
    this.name = name ?? this.name;
    this.description = description ?? this.description;
    this.price = price ?? this.price;
  }
}
```

`description` en la clase es `string`. En el DTO de alta es opcional. `create` igual hace `new Product(UuidV4(), name, description, price)`. Si omites la descripción, el argumento es `undefined` y el campo queda así. `updateWith` usa `??`, entonces un `description: undefined` no pisa el valor anterior, y un `price: 0` sí, porque 0 no es nullish. Esa diferencia importa: no puedes “borrar” la descripción mandando null si el JSON ni siquiera trae la clave, y un precio cero sí se guarda.

No hay `createdAt`, ni `IsDeleted`, ni `BaseEntity`. El borrado es quitar el elemento. No queda una lápida en el arreglo.

<a id="dtos"></a>

## DTOs, PartialType y el pipe

El alta no acepta `id`. El cliente no elige la clave.

```ts
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  price: number;
}
```

`UpdateProductDto` no copia los decoradores. `PartialType` los hereda y los vuelve opcionales. Encima agrego un `id` opcional con formato uuid. El servicio no usa ese `id` del cuerpo: lo descarta.

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsString()
  @IsUUID()
  @IsOptional()
  id?: string;
}
```

El pipe global está en `main.ts`:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
```

`whitelist` quita propiedades que no tienen decorador. `forbidNonWhitelisted` convierte esa propiedad extra en 400 en lugar de ignorarla. Un cuerpo `{"name":"Harina","price":1,"sku":"A1"}` no crea el producto. No hay `transform: true`. Por eso `@Type(() => Number)` no convierte un `"price": "2.4"` string en número: el JSON ya manda números, y un string falla `@IsNumber()` antes de que el `Type` actúe. Si más adelante quieres coercionar, enciendes `transform: true` en ese mismo pipe. En el repo no está.

No hay `@Min(0)` ni `@MaxLength`. Un precio negativo pasa. Un nombre vacío pasa `@IsString()`. El pipe cubre forma, no las reglas de la pastelería.

<a id="servicio"></a>

## El servicio es el almacén

`ProductsService` es `@Injectable`. El arreglo es privado y empieza vacío. No hay interfaz `ProductRepository`.

```ts
@Injectable()
export class ProductsService {
  private products: Product[] = [];

  create(createProductDto: CreateProductDto) {
    const { name, description, price } = createProductDto;
    const newProduct = new Product(UuidV4(), name, description, price);
    this.products.push(newProduct);
    return newProduct;
  }

  findAll() {
    return this.products;
  }

  findOne(id: string): Product {
    const product = this.products.find((product) => product.id == id);
    if (!product) {
      throw new NotFoundException(`Product with id: #${id} not found`);
    }
    return product;
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    const { id: __, name, description, price } = updateProductDto;
    const product = this.findOne(id);
    product.updateWith({ name, description, price });
    return product;
  }

  remove(id: string): Product {
    const product = this.findOne(id);
    this.products = this.products.filter((product) => product.id !== id);
    return product;
  }
}
```

Detalles que cambian el comportamiento y que dejo escritos como están:

- `find` usa `==`. Con dos strings da el mismo resultado que `===`. No normaliza mayúsculas del uuid.
- El mensaje de 404 es `Product with id: #<uuid> not found`, en inglés, con un `#` delante del id.
- `update` toma el id de la ruta. El `id` del cuerpo se renombra a `__` y se tira. Si el cuerpo trae otro uuid, no mueve el producto de clave.
- `remove` devuelve el producto ya sacado del arreglo. No devuelve 204 vacío. El controlador no envuelve la respuesta: Nest serializa el objeto.
- `create` no revisa nombres repetidos. Puedo insertar dos “Harina”. En la API Java eso es un 409. Aquí no.
- No hay paginación. `findAll` devuelve el arreglo completo.

El servicio conoce el DTO. En el corte de cuatro capas el repositorio conocería `Product` y el servicio haría el mapeo. Hoy las dos cosas son el mismo archivo. Es el punto que la evolución abre.

<a id="entorno"></a>

## Joi, el puerto y el prefijo

No hay cadena de conexión. La única variable obligatoria es `PORT`. `envs.ts` carga `dotenv` y valida con Joi. `.unknown(true)` deja pasar el resto del entorno, así que `PATH` no rompe el arranque.

```ts
import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
};
```

Si `PORT` falta, el proceso tira antes de escuchar. Eso es a propósito: mejor no adivinar un puerto. El archivo `.env` no se commitea. `nest new` ya lo ignora. Crea uno local:

```bash
echo 'PORT=3000' > .env
```

`3000` no es un secreto. Un secreto, el día que exista, sigue la misma regla que en las otras dos entregas: variable de entorno, nunca un literal dentro de un archivo que git rastrea. Borrar el literal en un commit posterior no lo saca del historial.

`main.ts` aplica el prefijo y el pipe, y escucha `envs.port`. El comentario del repo dice “commo” en vez de “como”. La llamada es `setGlobalPrefix('api')`.

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(envs.port);
  console.log(`Server running on port ${envs.port}`);
}
bootstrap();
```

Con eso, el controlador `@Controller('products')` publica `/api/products`, no `/products`. No hay `app.enableCors()`. Un front en otro origen necesita el encabezado que agregues después. No lo invento en esta mitad.

Arranque:

```bash
npm run start:dev
```

La consola imprime `Server running on port 3000` si el `.env` tiene ese puerto.

<a id="api"></a>

## Rutas y curl

| Verbo | Ruta | Pipe del id | Respuesta |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/products` | el cuerpo pasa por el pipe global | el `Product` nuevo |
| `GET` | `/api/products` | ninguno | el arreglo |
| `GET` | `/api/products/:id` | `ParseUUIDPipe` | un `Product` o 404 |
| `PATCH` | `/api/products/:id` | el id de la ruta no usa `ParseUUIDPipe` | el `Product` mutado o 404 |
| `DELETE` | `/api/products/:id` | `ParseUUIDPipe` | el `Product` eliminado o 404 |

`ParseUUIDPipe` rechaza lo que no es uuid con 400, antes del servicio. En `GET` y `DELETE` está. En `PATCH` no: `@Param('id') id: string`. Un `PATCH` con `abc` entra a `findOne` y responde 404, no 400. Es una diferencia real entre verbos del mismo controlador.

Alta:

```bash
curl -s -D - -X POST http://localhost:3000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Harina","description":"Todo uso","price":2.4}'
```

El JSON trae `id`, `name`, `description` y `price`. Guarda el `id` para los siguientes.

Lista, detalle, edición y borrado:

```bash
curl -s http://localhost:3000/api/products
curl -s http://localhost:3000/api/products/EL_UUID
curl -s -X PATCH http://localhost:3000/api/products/EL_UUID \
  -H 'Content-Type: application/json' \
  -d '{"price":3.1}'
curl -s -D - -X DELETE http://localhost:3000/api/products/EL_UUID
```

Después del `DELETE`, el `GET` del mismo id responde 404 con el mensaje del servicio. El cuerpo del `DELETE` exitoso es el producto, y el status que Nest pone por defecto es 200, no 204.

Casos que el pipe sí corta:

```bash
curl -s -D - -X POST http://localhost:3000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"price":1}'

curl -s -D - -X POST http://localhost:3000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sal","price":1,"sku":"A1"}'

curl -s -D - http://localhost:3000/api/products/no-es-uuid
```

El primero falla porque falta `name` (`@IsString` sin `@IsOptional`). El segundo falla por `sku`, que no está en el DTO y `forbidNonWhitelisted` está en true. El tercero es 400 del `ParseUUIDPipe`. No mando `Authorization`. No hay guard.

No hay Swagger en las dependencias. La tabla de arriba es el contrato. Si más adelante agregas `@nestjs/swagger`, el documento sale de los DTOs. Este repo no lo hace.

<a id="otro-recurso"></a>

## Cómo agrego otro recurso en este corte

Mientras siga el estilo del repo, una categoría nueva repite el módulo, no abre una capa.

```bash
nest g module categories
nest g controller categories --no-spec
nest g service categories --no-spec
mkdir -p src/categories/dto src/categories/entities
```

1. `Category` con constructor público y, si hay edición parcial, un `updateWith`.
2. `CreateCategoryDto` con `class-validator`. `UpdateCategoryDto` con `PartialType`.
3. `CategoriesService` con su propio arreglo. No lo guardes dentro de `products`.
4. Controlador `@Controller('categories')`. El prefijo `api` ya está en `main.ts`, así que la ruta queda `/api/categories`.
5. `ParseUUIDPipe` en todos los `:id`, incluido el `PATCH`, si quieres el mismo 400 que el `GET` de productos. El de productos no lo tiene en el `PATCH`.
6. Importa `CategoriesModule` en `AppModule`.
7. Un curl de alta, lista, detalle, patch y delete.

No toco `envs.ts` si el recurso tampoco tiene base. El `PORT` sigue siendo la única clave.

<a id="diferencias"></a>

## Dónde el código no coincide con el esquema

- Un feature module, no cuatro proyectos ni cuatro paquetes de dominio, aplicación, infraestructura y HTTP.
- No hay contrato de repositorio ni de servicio. `ProductsService` posee `Product[]`.
- El servicio recibe DTOs y devuelve la entidad. No hay mapeo a un DTO de salida.
- Existen `CreateProductDto` y `UpdateProductDto`. No existen DTOs de lista, de detalle ni de borrado.
- `UpdateProductDto` trae un `id` opcional que `update` descarta. La clave efectiva es la de la ruta.
- `PATCH :id` no usa `ParseUUIDPipe`. `GET` y `DELETE` sí.
- `description` es opcional en el DTO y obligatoria en el tipo de la entidad.
- El borrado es físico sobre el arreglo y la respuesta es el objeto, con 200.
- No hay filtro global. El 404 es `NotFoundException`. Cualquier otra excepción cae en el filtro por defecto de Nest.
- No hay JWT, ni hash, ni usuarios. El puerto se valida con Joi y `dotenv`. No hay user-secrets: el equivalente es `.env`, ignorado por git.
- No hay CORS, ni Swagger, ni paginación, ni nombres únicos.
- `@Type(() => Number)` está en el precio y el pipe no enciende `transform`.
- `uuid` está en la 11, que es ESM, dentro de un proyecto que el CLI deja en CommonJS.
- `AppModule` conserva el comentario `// Hola mundo`. El comentario del prefijo escribe “commo”.

<a id="evolucion-repo"></a>

## Evolución: dominio, repositorio y token

De aquí en adelante el código es el paso siguiente. No está en NestJS-Products. Lo uso cuando el arreglo tiene que poder cambiarse por SQLite sin reescribir el controlador.

La entidad de dominio se queda sin decoradores de TypeORM ni de Prisma. Es la misma clase, movida a `domain/`, y `description` pasa a `string | undefined` para coincidir con el alta.

```ts
export interface ProductPatch {
  name?: string;
  description?: string;
  price?: number;
}

export class Product {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | undefined,
    public price: number,
  ) {}

  updateWith({ name, description, price }: ProductPatch) {
    this.name = name ?? this.name;
    this.description = description ?? this.description;
    this.price = price ?? this.price;
  }
}
```

`id` queda `readonly`. Ni el repositorio ni el `PATCH` lo cambian.

El contrato vive al lado del dominio. Habla de `Product`, no de filas ni de DTOs.

```ts
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductRepository {
  save(product: Product): Promise<Product>;
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  delete(id: string): Promise<void>;
}
```

`findById` devuelve `null`. Quien decide el 404 es el servicio de aplicación, no el driver. `delete` no devuelve la entidad: el servicio ya la cargó.

La implementación en memoria es el arreglo que hoy está en `ProductsService`, sacado de ahí.

```ts
@Injectable()
export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Product[] = [];

  async save(product: Product): Promise<Product> {
    const index = this.products.findIndex((item) => item.id === product.id);
    if (index >= 0) {
      this.products[index] = product;
    } else {
      this.products.push(product);
    }
    return product;
  }

  async findAll(): Promise<Product[]> {
    return [...this.products];
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.find((item) => item.id === id) ?? null;
  }

  async delete(id: string): Promise<void> {
    const next = this.products.filter((item) => item.id !== id);
    this.products.length = 0;
    this.products.push(...next);
  }
}
```

`findAll` devuelve una copia. El controlador no puede hacer `push` sobre la lista interna.

TypeORM entra como otra clase, con una fila distinta de la entidad. Instalo las versiones que publican peer de Nest 10. El almacén en memoria no las necesita.

```bash
npm install @nestjs/typeorm@10.0.2 typeorm@0.3.20 sqlite3@5.1.7
```

```ts
@Entity('products')
export class ProductRow {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column('decimal', { precision: 12, scale: 2 })
  price: number;
}
```

El repositorio TypeORM mapea fila y dominio. El servicio nunca ve `ProductRow`.

```ts
@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductRow)
    private readonly rows: Repository<ProductRow>,
  ) {}

  async save(product: Product): Promise<Product> {
    await this.rows.save({
      id: product.id,
      name: product.name,
      description: product.description ?? null,
      price: product.price,
    });
    return product;
  }

  async findAll(): Promise<Product[]> {
    const rows = await this.rows.find();
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.rows.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.rows.delete({ id });
  }

  private toDomain(row: ProductRow): Product {
    return new Product(row.id, row.name, row.description ?? undefined, Number(row.price));
  }
}
```

`decimal` a veces vuelve como string desde el driver. `Number(row.price)` deja el dominio en número, que es lo que `@IsNumber` produjo en el alta. SQLite con el driver `sqlite3` se abre así, y solo cuando elijo este almacén:

```ts
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: 'products.db',
  entities: [ProductRow],
  synchronize: true,
})
```

`synchronize: true` crea la tabla al arrancar. Me sirve en local. No lo dejo apuntando a una base compartida: puede alterar columnas. `products.db` va al `.gitignore`. No pongas una URL con usuario y clave en un archivo commiteado. Si el archivo no es SQLite, la URL entra por el entorno.

Prisma es la tercera implementación, no un segundo modelo de dominio. Lo instalo aparte:

```bash
npm install @prisma/client@5.22.0
npm install -D prisma@5.22.0
npx prisma init --datasource-provider sqlite
```

`schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Product {
  id          String  @id
  name        String
  description String?
  price       Float
}
```

```bash
echo 'DATABASE_URL="file:./products.db"' >> .env
npx prisma migrate dev --name init
```

`DATABASE_URL` con `file:` no lleva contraseña. Si algún día el provider es Postgres, esa variable se exporta en el host y `.env` sigue fuera de git.

```ts
@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(product: Product): Promise<Product> {
    await this.prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        name: product.name,
        description: product.description ?? null,
        price: product.price,
      },
      update: {
        name: product.name,
        description: product.description ?? null,
        price: product.price,
      },
    });
    return product;
  }

  async findAll(): Promise<Product[]> {
    const rows = await this.prisma.product.findMany();
    return rows.map((row) => new Product(row.id, row.name, row.description ?? undefined, row.price));
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row ? new Product(row.id, row.name, row.description ?? undefined, row.price) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } }).catch(() => undefined);
  }
}
```

`PrismaService` extiende `PrismaClient` e implementa `OnModuleInit` para llamar `.$connect()`, y `OnModuleDestroy` para `.$disconnect()`. Es el único sitio que conoce el cliente generado.

El token elige una implementación. No construyo las tres a la vez: TypeORM abriría SQLite aunque nadie lo use. Un módulo dinámico registra solo la elegida. `envs.store` sale de Joi:

```ts
PRODUCT_STORE: joi.string().valid('memory', 'typeorm', 'prisma').default('memory'),
DATABASE_URL: joi.string().default('file:./products.db'),
```

```ts
@Module({})
export class ProductsPersistenceModule {
  static register(): DynamicModule {
    if (envs.store === 'typeorm') {
      return {
        module: ProductsPersistenceModule,
        imports: [
          TypeOrmModule.forRoot({
            type: 'sqlite',
            database: 'products.db',
            entities: [ProductRow],
            synchronize: true,
          }),
          TypeOrmModule.forFeature([ProductRow]),
        ],
        providers: [{ provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository }],
        exports: [PRODUCT_REPOSITORY],
      };
    }

    if (envs.store === 'prisma') {
      return {
        module: ProductsPersistenceModule,
        providers: [
          PrismaService,
          { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
        ],
        exports: [PRODUCT_REPOSITORY],
      };
    }

    return {
      module: ProductsPersistenceModule,
      providers: [{ provide: PRODUCT_REPOSITORY, useClass: InMemoryProductRepository }],
      exports: [PRODUCT_REPOSITORY],
    };
  }
}
```

El valor por defecto sigue siendo `memory`. Quien clona y no exporta `PRODUCT_STORE` obtiene el mismo arreglo de siempre, ahora detrás del contrato.

El servicio de aplicación ya no tiene el arreglo. Pide el token.

```ts
@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async create(dto: ProductCreateDto): Promise<ProductGetByIdDto> {
    const product = new Product(randomUUID(), dto.name, dto.description, dto.price);
    await this.products.save(product);
    return this.toDetail(product);
  }

  async findAll(): Promise<ProductGetListDto[]> {
    const items = await this.products.findAll();
    return items.map((item) => ({ id: item.id, name: item.name, price: item.price }));
  }

  async findOne(id: string): Promise<ProductGetByIdDto> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id: #${id} not found`);
    }
    return this.toDetail(product);
  }

  async update(id: string, dto: ProductUpdateDto): Promise<ProductGetByIdDto> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id: #${id} not found`);
    }
    product.updateWith(dto);
    await this.products.save(product);
    return this.toDetail(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id: #${id} not found`);
    }
    await this.products.delete(id);
  }
}
```

Uso `randomUUID` de `node:crypto` en este corte para no depender de `uuid` 11. El id sigue siendo un uuid. El mensaje de 404 lo dejé igual que el servicio original para que el cliente no cambie de texto solo porque apareció una interfaz.

`ProductsModule` importa `ProductsPersistenceModule.register()` y declara el controlador y el servicio. El controlador sigue sin conocer el token.

<a id="evolucion-dtos"></a>

## Evolución: DTOs por uso

En el repo, lista y detalle devuelven `Product`, y el update reutiliza el alta en parcial. En este corte separo lo que entra de lo que sale. El borrado sigue sin DTO: el id va en la ruta, con `ParseUUIDPipe` también en el `PATCH`.

| Clase | Quién la ve | Campos |
| :--- | :--- | :--- |
| `ProductCreateDto` | cuerpo del `POST` | `name`, `description?`, `price` |
| `ProductUpdateDto` | cuerpo del `PATCH` | los mismos, todos opcionales, sin `id` |
| `ProductGetListDto` | cada ítem del `GET` colección | `id`, `name`, `price` |
| `ProductGetByIdDto` | `GET :id`, alta y edición | `id`, `name`, `description`, `price` |

`ProductCreateDto` es el `CreateProductDto` de hoy, con `@Min(0)` en el precio. Eso sí es una regla nueva: el repo la deja pasar. La anoto como parte de la evolución, no como comportamiento actual.

```ts
export class ProductCreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;
}

export class ProductUpdateDto extends PartialType(ProductCreateDto) {}

export class ProductGetListDto {
  id: string;
  name: string;
  price: number;
}

export class ProductGetByIdDto {
  id: string;
  name: string;
  description?: string;
  price: number;
}
```

`ProductUpdateDto` ya no declara `id`. No hay nada que descartar con `id: __`. El pipe, en este corte, sí lleva `transform: true` para que `@Type` corra:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

El controlador de la evolución devuelve los DTOs de salida y el `DELETE` queda en 204.

```ts
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: ProductCreateDto) {
    return this.productsService.create(dto);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductUpdateDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
```

<a id="evolucion-jwt"></a>

## Evolución: JWT, hash y filtro

NestJS-Products no autentica. La plantilla .NET sí, con Identity y un secreto fuera del JSON. Aquí el equivalente es chico: un hash con `scrypt` de Node, un `JwtModule` y un guard. No uso una clave de ejemplo sacada de ningún entorno. Joi exige 32 caracteres o más y el proceso no arranca si falta.

```ts
JWT_SECRET: joi.string().min(32).required(),
```

```bash
echo 'JWT_SECRET=cambia-esta-cadena-por-una-larga-y-aleatoria' >> .env
```

Genera la tuya con `openssl rand -base64 48`. No la pegues en `envs.ts`.

```bash
npm install @nestjs/jwt@10.2.0
```

El hash no necesita paquete nativo. `scrypt` ya está en `node:crypto`. Guardo `salt:hash` en hex. Comparo con `timingSafeEqual` sobre buffers del mismo largo.

```ts
const scryptAsync = promisify(scrypt);

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(plain, salt, 32)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const derived = (await scryptAsync(plain, salt, 32)) as Buffer;
  const actual = Buffer.from(hex, 'hex');
  if (actual.length !== derived.length) return false;
  return timingSafeEqual(actual, derived);
}
```

El registro de usuarios de esta evolución también es en memoria, dentro de `AuthService`, y el login firma una hora. Es el mismo vencimiento fijo de la plantilla .NET, no un `ExpiryTime` leído y luego ignorado.

```ts
JwtModule.register({
  secret: envs.jwtSecret,
  signOptions: { expiresIn: '1h' },
})
```

```ts
async login(email: string, password: string) {
  const user = this.users.find((item) => item.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedException('Credenciales inválidas.');
  }
  const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
  return { accessToken };
}
```

El guard es un `CanActivate`. Lee `Authorization: Bearer` y pone el payload en `request.user`. No abre la base.

```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = String(request.headers.authorization ?? '');
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }
    try {
      request.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

`@UseGuards(JwtAuthGuard)` va en `ProductsController`. `AuthController` (`POST /api/auth/register` y `POST /api/auth/login`) se queda sin guard. El prefijo global ya pone `/api`.

Curl, con una clave de mentira solo en la petición, no en el repo:

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"hugo@example.com","password":"Clave.Segura1"}'

curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hugo@example.com","password":"Clave.Segura1"}'

curl -s http://localhost:3000/api/products \
  -H "Authorization: Bearer PEGA_EL_ACCESS_TOKEN"
```

Sin el encabezado, el guard responde 401. En el repo original ese `GET` es público. Si comparas los dos comportamientos, la diferencia es esta evolución, no un cambio silencioso del módulo de hoy.

El filtro global reemplaza el cuerpo por defecto de las excepciones que no controlo. Las `HttpException` conservan su status. El resto es 500 con un mensaje fijo. El stack se queda en el log.

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException
      ? exception.message
      : 'Error interno.';

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({ statusCode: status, message });
  }
}
```

```ts
app.useGlobalFilters(new AllExceptionsFilter());
```

`NotFoundException` sigue llegando como 404. Un fallo de SQLite ya no devuelve el mensaje del driver al cliente.

<a id="checklist"></a>

## Checklist

El repo, antes de llamarlo terminado:

- [ ] `nest --version` es 10 y `node` es 20.
- [ ] Las dependencias extra están en 0.14.1, 0.5.1, 16.4.5, 17.13.3 y uuid 11, o uuid 9 si CommonJS no carga la 11.
- [ ] `.env` tiene `PORT` y no está en git. Joi tira si falta.
- [ ] `setGlobalPrefix('api')` y el pipe con `whitelist` y `forbidNonWhitelisted`.
- [ ] `POST /api/products` sin `name`, o con un campo extra, responde 400.
- [ ] `GET` y `DELETE` con un id que no es uuid responden 400. El `PATCH` del repo, con el mismo id, responde 404.
- [ ] Reiniciar el proceso vacía la lista.
- [ ] El servicio sigue siendo el dueño del arreglo. No hay token todavía.

La evolución, cuando la aplique:

- [ ] `Product` no importa TypeORM ni Prisma. La fila y el `model` Prisma están en infraestructura.
- [ ] `ProductRepository` no menciona DTOs. El servicio de aplicación sí.
- [ ] `PRODUCT_REPOSITORY` tiene una sola implementación registrada, elegida por `PRODUCT_STORE`. El default es `memory`.
- [ ] Lista y detalle usan DTOs distintos. El update no trae `id`. El `DELETE` es 204 y los tres `:id` usan `ParseUUIDPipe`.
- [ ] `JWT_SECRET` sale del entorno, Joi pide al menos 32 caracteres, y no hay un literal en el código.
- [ ] El guard cubre productos y no cubre login ni registro.
- [ ] El filtro global no escribe el stack en el JSON.
- [ ] `products.db` está en `.gitignore`.

<a id="resumen"></a>

## Resumen

NestJS-Products es un feature: `ProductsModule` junta el controlador, el servicio y dos DTOs, y el servicio guarda los productos en un arreglo. Joi obliga a tener `PORT`. El prefijo `api` y un `ValidationPipe` con whitelist cubren todas las rutas. `PartialType` arma el update. `ParseUUIDPipe` cubre el detalle y el borrado, y no el `PATCH`. No hay repositorio, ni DTOs de salida, ni JWT, ni base.

Cuando ese módulo se queda corto, el arreglo se muda a `InMemoryProductRepository`, el dominio se queda en `Product`, y TypeORM o Prisma entran como otras clases del mismo `ProductRepository`, elegidas con un token. El servicio pasa a hablar DTOs de lista y de detalle. El JWT y el filtro se agregan al composition root, con el secreto en el entorno. Hasta entonces, el código que corre es el de la primera mitad.

Las otras dos entregas de la serie están en [.NET 10](/post/construyendo-apis-por-capas-dotnet) y en [Spring Boot y JDBC](/post/construyendo-apis-por-capas-spring).
