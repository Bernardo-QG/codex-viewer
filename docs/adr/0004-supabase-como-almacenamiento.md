# 0004. Supabase como almacenamiento de documentos

- **Estado:** Aceptado
- **Fecha:** 2026-08-22

## Contexto

Al inicio los documentos eran archivos `.md` dentro del repo, listados con un `documents.json` que había que mantener a mano. Cada nota nueva requería un commit, y no se podía editar desde el navegador.

## Decisión

Los documentos viven en una base PostgreSQL de Supabase (proyecto `codex`), en la tabla `documents`. El sitio los consulta con `supabase-js` a través de la API REST. El esquema está versionado en `db/schema.sql`.

- `slug` es único y se valida con un `CHECK` (`^[a-z0-9]+(-[a-z0-9]+)*$`).
- `updated_at` se mantiene con un trigger.
- `admin.html` ofrece altas, cambios y bajas con editor (ver [0005](0005-editor-easymde.md)).

## Alternativas consideradas

- **Seguir con archivos en el repo:** es simple, pero no se puede editar en línea y la lista se mantiene a mano.
- **Backend propio (Spring Boot, Node):** requiere hospedaje con costo y mantenimiento.
- **Firebase:** es equivalente, pero Supabase da SQL real, esquema versionable y API REST automática.

## Consecuencias

- Se pueden crear y editar notas desde el navegador, sin hacer commits.
- El contenido ya no se versiona en Git. Los respaldos dependen de Supabase o de exportaciones manuales.
- El sitio depende de un servicio externo y de su plan gratuito.
- La seguridad depende de las políticas RLS (ver [0007](0007-seguridad-con-llave-publicable-y-rls.md)).
