# 0006. Categorías y orden manual de documentos

- **Estado:** Aceptado, ampliado por [0008](0008-secciones-etiquetas-y-estado.md)
- **Fecha:** 2026-08-22

## Contexto

Con más documentos, una lista plana ordenada por `id` dejó de ser útil para navegar. Hacía falta agrupar por tema y controlar el orden de lectura.

## Decisión

- Tabla `categories` (`name`, `slug`, `sort_order`) y en `documents` la relación `category_id` (con `ON DELETE SET NULL`) y un `sort_order` propio.
- La consulta trae la categoría embebida (`category:categories(...)`) y el orden se aplica en el cliente: categoría por `sort_order`, luego por nombre, luego el documento por `sort_order` y luego por título. Los documentos sin categoría van al final, en "Sin categoría".
- Si la consulta con categorías falla porque el esquema no se ha migrado, se usa una lista simple ordenada por `id`.
- Las categorías se crean por SQL. El panel solo las asigna.

## Alternativas consideradas

- **Campo de texto `category` en `documents`:** es más simple, pero no permite ordenar categorías y facilita errores de escritura.
- **Etiquetas muchos a muchos:** más flexible de lo que se necesita para un menú.
- **Ordenar en la consulta SQL:** PostgREST no ordena la tabla padre por una columna de la tabla embebida sin crear una vista.

## Consecuencias

- El menú refleja la estructura deseada sin depender del orden de inserción.
- Ordenar en el cliente está bien para decenas o cientos de documentos. Si crecen mucho, conviene una vista o una función RPC.
- Falta una pantalla para administrar categorías.
