---
title: "Maquetar libros con Angular, FastAPI y Typst"
author: Hugo Colmenares
date: 2026-11-11
tags: [angular, fastapi, typst, python, bookpublisher]
excerpt: "Un recorrido por BookPublisher, un estudio local para pasar de un manuscrito a un PDF de aspecto profesional, con cuatro temas: Códice, Novela clásica, Manual técnico y Sencillo."
category: full-stack
series: Proyectos
status: published
---

Quienes escribimos textos largos solemos terminar con el mismo problema: el manuscrito está en un lado, la maquetación en otro, y el PDF final depende de un programa pesado o de un servicio en la nube. Yo quería algo más simple y, sobre todo, privado: que el libro no saliera de mi computador.

Así nació BookPublisher, un estudio local para maquetar libros, novelas, guías y manuales. Es hermano de MagazinePublisher, que pensé para revistas cortas. En este artículo vamos a ver el recorrido de un texto hasta el PDF, el stack que usé y los cuatro temas con los que se puede vestir un libro.

## Qué hace, en palabras simples

El flujo se puede mirar en dos direcciones.

Hacia adelante, abrimos un Markdown, un texto plano o un Word, elegimos un tema y unas opciones —tamaño de página, cuerpo de letra, si cada capítulo empieza en página nueva o en impar— y exportamos un PDF de calidad de imprenta. También se puede exportar otra vez a Word o a Markdown.

Hacia atrás, podemos importar un PDF y convertirlo a Markdown o a Word, cuidando títulos, párrafos, cursivas, listas, tablas, notas e imágenes, y quitando cabeceras, pies, números de página y palabras partidas al final del renglón.

Todo ocurre en la máquina. No se sube el manuscrito a ningún servidor ajeno. Eso, para quien trabaja con textos propios, no es un detalle menor.

## El recorrido en el estudio

El estudio es una aplicación en Angular 22: componentes independientes, signals y sin zone.js, con un lenguaje visual cercano al de MagazinePublisher.

Se levanta un servidor local con FastAPI y se abre el estudio en el navegador. Ahí pegamos o abrimos el texto, recorremos los capítulos y vemos una vista previa. Hay una barra de progreso real, un tiempo restante y la posibilidad de cancelar en el momento. Si volvemos a exportar el mismo libro, una caché por capítulo acelera el trabajo.

También se puede usar por la línea de órdenes, o desde Python, para quien prefiera automatizar. Yo, para revisar un capítulo, me quedo con el estudio: ver el resultado al lado del texto cambia la forma de corregir.

## Por qué Angular, FastAPI y Typst

Typst, para quienes no lo hayan usado, es un sistema para componer documentos. En BookPublisher no hay que instalarlo por fuera: viaja como un paquete de Python. Él se encarga de la tipografía fina: justificación, partición de palabras, capitulares, índices, notas, recuadros y código.

FastAPI expone el motor en local y avisa el avance mientras se exporta. Angular es la mesa de trabajo: elegir tema, hojear capítulos y no perderse en una consola.

Junto a eso, PyMuPDF lee y une PDF, y otras librerías se ocupan de Word y de Markdown. El motor pide Python 3.11 o superior; el estudio, Node para compilarlo. Una vez construido, el uso diario parte del servidor local.

¿Por qué no un procesador de texto tradicional? Porque quería temas reutilizables y un pipeline predecible para libros largos, no un diseño hecho a mano página por página.

## Los cuatro temas

Cada tema no es solo una paleta. Cambia el tamaño, las fuentes y las costumbres de la página.

**Códice** evoca un tratado antiguo en pergamino: fuentes con ese aire, versalitas espaciadas, filetes con rombo, capítulos en romanos, capitulares rojas e índice con puntos guía. Lo pensé a partir del estilo de unos manuales de referencia que uso en otros proyectos.

**Novela clásica** va en A5, con una serif justificada y partición silábica, sangrías, capitulares, capítulos que empiezan en página impar, control de viudas y huérfanas, y cabeceras en versalitas. Es el camino natural para una novela.

**Manual técnico** va en A4, con una sans para la interfaz del documento, una serif para el cuerpo y una monoespaciada para el código. Trae secciones numeradas, código con color, recuadros de nota, consejo o advertencia, tablas rayadas e índice por secciones.

**Sencillo** es el más discreto: un tamaño de 6×9 pulgadas, una serif clara y casi ningún adorno. A veces lo que el texto necesita es, precisamente, no competir con el diseño.

El formato de entrada acepta front matter, notas al pie, recuadros, versalitas y capítulos sin número. Hay una guía y una muestra que usan todo eso, con textos de dominio público o escritos para el proyecto, como unos capítulos del Quijote.

## Libros largos, de verdad

Un temor razonable es que esto solo sirva para un cuento corto. Lo medí con libros largos, en la máquina de desarrollo, el 10 de noviembre de 2026.

Una novela de unas 680 páginas, con el tema Novela clásica, se exportó en frío en menos de dos segundos, y en unos 0,2 segundos cuando la caché ya estaba caliente. El Quijote completo, que en ese mismo tema da 1.026 páginas, tardó unos 4 segundos en frío y 0,2 en caliente. No hace falta memorizar los decimales: la idea es que un libro largo no se queda pensando minutos.

Eso se logra componiendo por capítulos, en paralelo, con progreso visible y cancelación inmediata. Al principio una sola composición del libro entero era más lenta y no permitía mostrar un avance real. Trocearlo cambió el trato diario con la herramienta.

## Lo que aprendí

Si bien hay editores profesionales muy capaces, sin embargo, para mi flujo me hacía falta una mesa propia: privada, predecible y con temas que yo pudiera mantener.

También aprendí que el diseño de un libro es un sistema. Si el tema está bien pensado, el texto puede cambiar y el resultado sigue viéndose como un libro, no como un export improvisado.

Como acabamos de ver, BookPublisher recorre el camino del manuscrito al PDF con un estudio en Angular, un motor local en FastAPI y Typst para la composición, y cuatro temas que van del códice al manual. El código está en [github.com/FeithNoir/BookPublisher](https://github.com/FeithNoir/BookPublisher). ¿Ustedes, cuando terminan un texto largo, lo dejan en el procesador o lo llevan a una maquetación con cara de libro?
