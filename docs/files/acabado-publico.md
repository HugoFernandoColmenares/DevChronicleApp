# Acabado público: 404, metadatos y rastreo

El catálogo, el lector y Studio ya estaban cubiertos. Este documento describe el acabado que
convierte el cliente en un sitio publicable: página 404, título y descripción por vista, canonical,
Open Graph, Twitter Cards, datos estructurados, `robots.txt`, `sitemap.xml` y la imagen social.

## Metadatos por vista

`SeoService` (`src/app/core/services/seo.service.ts`) es el único punto que escribe el `<head>`. Cada
vista llama a `setPage()` en su constructor, o a `setArticle()` cuando el lector ya tiene los
metadatos de Firestore.

- **Landing:** título, descripción y JSON-LD `WebSite`.
- **Archivo `/articles`:** título, descripción y JSON-LD `CollectionPage`.
- **Lector `/post/:slug`:** título, descripción, `og:type=article`, fechas, autor y JSON-LD
  `BlogPosting`.
- **404 y errores:** `noindex, nofollow` y sin datos estructurados.
- **Studio:** `noindex` desde el cliente y desde Hosting.

El servicio actualiza, sin duplicar:

- `<title>`
- `meta[name=description]` y `meta[name=robots]`
- `link[rel=canonical]` con el origen de `environment.siteUrl`
- `og:title`, `og:description`, `og:url`, `og:image`, `og:type`, `og:site_name`, `og:locale`
- `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `article:published_time`, `article:modified_time`, `article:author`, `article:section`
- `<script type="application/ld+json">` con id `devchronicle-jsonld`

La descripción de respaldo y la imagen social viven en `environment.ts`:

```ts
siteUrl: 'https://devchronicle-hugo.web.app',
defaultDescription: '...',
socialImage: '/social/devchronicle-cover.png',
```

`scripts/write-environment.mjs` copia `NG_APP_SITE_URL` y `NG_APP_DESCRIPTION` al environment de
producción, y `scripts/write-site-meta.mjs` genera `robots.txt` y `sitemap.xml`. Cuando llegue un
dominio propio, se cambia `NG_APP_SITE_URL` en `.env` y en la variable de repositorio
`NG_APP_SITE_URL` de GitHub; no hay que tocar componentes ni archivos estáticos.

## Límite real de una SPA

Los rastreadores sociales (WhatsApp, X, Facebook, LinkedIn) **no ejecutan JavaScript**. Ven el HTML
crudo de `index.html`, así que la tarjeta social compartida es la genérica del sitio. Google sí
renderiza el cliente y lee los metadatos por artículo.

Para tener vista previa distinta por artículo haría falta prerender en el build o una función que
sirva HTML por ruta. Ninguna de las dos está en el plan Spark actual, así que el acabado se limita a
la tarjeta genérica más los metadatos que Google sí consume. Queda anotado como deuda post-MVP.

## Página 404

`app.routes.ts` ya no redirige `**` a la landing. La ruta comodín carga `NotFoundComponent`
(`/404` también la reutiliza). La vista:

- Marca `noindex, nofollow` con `SeoService`.
- Ofrece dos salidas: archivo completo y portada.
- Usa los tokens de Civic Terminal, sin un tema paralelo.

El lector conserva su estado de error: `not-found` muestra un 404 dentro del lector, y un fallo de
Firestore muestra un 503 con explicación. El modal de error solo aparece para fallos reales de
lectura, no para un enlace roto.

**Hosting no puede devolver un estado HTTP 404** mientras `firebase.json` reescriba todo a
`index.html`: la respuesta es 200 con la vista 404. Para un 404 real haría falta SSR, prerender o una
función. La vista con `noindex` evita que Google indexe la URL como contenido válido.

## robots.txt y sitemap.xml

- `public/robots.txt` permite el catálogo, bloquea `/admin`, `/admin/**` y el alias `/articulos`, y
  declara el sitemap. Se genera en el build desde `NG_APP_SITE_URL`
  (`scripts/write-site-meta.mjs`).
- `public/sitemap.xml` lista las rutas estables `/` y `/articles` con el mismo origen. Los artículos
  se descubren desde el archivo; un sitemap dinámico con todos los slugs necesita una función o un
  paso de build contra Firestore, fuera del alcance de Spark.
- `firebase.json` añade `X-Robots-Tag: noindex, nofollow` a `/admin` y `/admin/**`, además de
  `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.

## Imagen social

`public/social/devchronicle-cover.png`, 1200x630, con el mismo lenguaje Civic Terminal: lienzo
`#fafafa`, tinta `#0f172a`, acento `#0ea5e9` y banda `#1e293b`. Se referencia desde `index.html` y
desde `SeoService`.

## Verificación

1. `npm run build` y `npm test`.
2. Abrir `/`, `/articles`, `/post/<slug>`, `/post/no-existe` y `/ruta-inexistente`.
3. En cada una, revisar `<title>`, `meta[name=description]`, `link[rel=canonical]`, etiquetas `og:*`
   y el script `application/ld+json`.
4. Confirmar que la 404 y los errores muestran `noindex`.
5. Compartir la portada y comprobar la tarjeta genérica.
