# 0008. Organización del contenido: secciones anidadas, etiquetas, estado y resumen

- **Estado:** Aceptado
- **Fecha:** 2026-11-21
- **Amplía:** [0006](0006-categorias-y-orden-de-documentos.md)

## Contexto

Con categorías de un solo nivel (ver [0006](0006-categorias-y-orden-de-documentos.md)) el menú sigue siendo, en la práctica, una lista plana de documentos. Hacía falta:

- Agrupar por áreas y subáreas (Desarrollo › Backend › Spring Boot).
- Relacionar temas que cruzan secciones (Git aparece en herramientas, en guías y en procesos).
- Escribir documentos sin publicarlos todavía.
- Describir cada documento en una línea para el listado, la búsqueda y la vista previa al compartir.

## Decisión

**Secciones anidadas.** `categories` gana `parent_id` (lista de adyacencia) y `description`. El nombre deja de ser único global y pasa a ser único dentro del mismo padre (`UNIQUE NULLS NOT DISTINCT (parent_id, name)`). Borrar una sección con subsecciones está prohibido (`ON DELETE RESTRICT`); al borrar una sección, sus documentos quedan sin sección (`ON DELETE SET NULL`).

**Etiquetas.** Tablas `tags` y `document_tags` (muchos a muchos). PostgREST las expone embebidas: `documents?select=*,tags(name,slug)`. El panel crea las etiquetas al vuelo a partir de una lista separada por comas.

**Estado.** `documents.status` es `draft` o `published` (`CHECK`), con `published` por defecto para que la migración no oculte nada. El visor solo muestra publicados; con `?preview=1` muestra borradores.

**Resumen.** `documents.summary`, de hasta 300 caracteres. Se muestra bajo el título, se usa en la búsqueda y en la meta `description`.

**El árbol se arma en el cliente.** Se traen todas las secciones y documentos en dos consultas paralelas, y `utils.js` construye el árbol, oculta las secciones vacías y calcula la ruta (breadcrumb).

**Migraciones versionadas.** Los cambios a una base existente van en `db/migrations/AAAA-MM-DD_descripcion.sql`, idempotentes y dentro de una transacción. `db/schema.sql` siempre representa el esquema completo para una instalación nueva.

## Alternativas consideradas

- **Ruta materializada (`ltree`) o closure table:** consultas de subárbol más rápidas, pero más complejidad al mover secciones. Con decenas de secciones, armar el árbol en el cliente es instantáneo.
- **Columna `text[]` de etiquetas en `documents`:** más simple, pero sin catálogo de etiquetas ni forma de renombrarlas en un solo lugar.
- **`boolean published`:** un enum de texto deja espacio para estados futuros (por ejemplo `archived`) sin migrar el tipo.

## Consecuencias

- El menú refleja la estructura del conocimiento, con secciones plegables y documentos sueltos en la raíz.
- La búsqueda cubre título, resumen, sección y etiquetas; `#etiqueta` filtra por etiqueta exacta.
- **Los borradores se ocultan en la interfaz, pero la API los sigue entregando** mientras no exista RLS. La política de [0007](0007-seguridad-con-llave-publicable-y-rls.md) debe limitar la lectura anónima a `status = 'published'`.
- Las etiquetas que dejan de usarse quedan en el catálogo; se pueden limpiar por SQL.
- Falta una pantalla para administrar secciones; por ahora se crean por SQL (ver `db/seed.sql`).
