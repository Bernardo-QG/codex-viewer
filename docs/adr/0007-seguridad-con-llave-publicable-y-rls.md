# 0007. Llave publicable en el cliente y protección con RLS y Auth

- **Estado:** Propuesto
- **Fecha:** 2026-11-21

## Contexto

Al ser un sitio estático (ver [0002](0002-sitio-estatico-sin-compilacion.md)), la llave de Supabase va en `assets/js/config.js` y cualquiera puede verla. No hay forma de ocultarla: el navegador la necesita para consultar.

Hoy `admin.html` escribe con esa misma llave, así que la tabla acepta escrituras anónimas. Cualquiera puede modificar o borrar documentos con la API REST.

## Decisión

- La llave **publicable** (`sb_publishable_…`) se acepta como pública, porque está diseñada para eso.
- La llave **secreta** (`sb_secret_…` o `service_role`) nunca entra al repositorio. Solo se usa en herramientas locales como Bruno, en entornos que no se versionan.
- Se habilita RLS en `documents`, `categories`, `tags` y `document_tags`:
  - `SELECT` para `anon` solo de documentos con `status = 'published'` (ver [0008](0008-secciones-etiquetas-y-estado.md)); `categories`, `tags` y `document_tags` de lectura pública.
  - `INSERT`, `UPDATE` y `DELETE` solo para el UUID del autor.
- `admin.html` pide iniciar sesión con Supabase Auth (correo y contraseña) y el registro público se desactiva.

## Alternativas consideradas

- **Proxy o función serverless que guarde la llave:** solo oculta la llave pero no resuelve la autorización, y agrega infraestructura.
- **Quitar el panel y editar desde el dashboard de Supabase:** es seguro, pero se pierde la comodidad del editor.

## Consecuencias

- La base queda protegida aunque la llave sea pública.
- El panel exige iniciar sesión.
- **Pendiente:** implementar el login en el panel y aplicar las políticas. Hay que hacerlo en ese orden; si se aplica RLS antes, el panel deja de poder guardar.
