# Codex

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/18334613?s=400&u=e7bdce3bde7c8aaca98e291e31f7fc2911203d8f&v=4" alt="Bernardo Quintino Guzmán" width="200" style="border-radius: 50%;" />
</p>

Visualizador de documentos Markdown con panel de administración. Los documentos viven en Supabase (base de datos `codex`) y se agrupan por categoría en el menú lateral.

**Sitio:** https://bernardo-qg.github.io/codex-viewer/

## Estructura

| Ruta | Descripción |
| --- | --- |
| `index.html` | Visor público: sidebar agrupado por categoría y renderizado con zero-md |
| `admin.html` | Panel CRUD con editor EasyMDE, categoría y orden por documento |
| `assets/js/utils.js` | Cliente Supabase y utilidades compartidas (consulta, orden, listado, escape de HTML) |
| `assets/js/api.js` | Lógica del visor |
| `assets/js/admin.js` | Lógica del panel |
| `db/schema.sql` | Tablas `categories` y `documents`, índice y trigger de `updated_at` |
| `db/seed.sql` | Datos de ejemplo (no ejecutar en producción) |
| `assets/bruno/` | Colección de Bruno para probar la API REST |

## Configuración

1. Crea el esquema ejecutando `db/schema.sql` en el SQL Editor de Supabase.
2. Coloca la URL del proyecto y la llave publicable en `assets/js/config.js`.
3. Sirve la carpeta con cualquier servidor estático (por ejemplo, `npx serve .`) o publícala en GitHub Pages.

Las categorías se crean directamente en la tabla `categories`; el panel permite asignarlas y definir el orden de cada documento. Si la tabla aún no existe, el sitio sigue funcionando con una lista simple.

## Autor

[Bernardo Quintino Guzmán](https://github.com/Bernardo-QG)
