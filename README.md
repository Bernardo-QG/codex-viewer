# Codex

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/18334613?s=400&u=e7bdce3bde7c8aaca98e291e31f7fc2911203d8f&v=4" alt="Bernardo Quintino Guzmán" width="200" style="border-radius: 50%;" />
</p>

Visualizador de documentos Markdown con panel de administración. Los documentos viven en Supabase (base de datos `codex`) y se muestran agrupados por categoría en el menú lateral.

**Sitio:** https://bernardo-qg.github.io/codex-viewer/

## Funcionalidades

- **Visor:** lista de documentos agrupada por categoría y ordenada, navegación sin recargar la página (`?doc=<slug>`) y menú lateral adaptable a móvil.
- **Panel de administración** (`admin.html`): crea, edita y elimina documentos con editor Markdown, asigna categoría y orden, y abre el documento publicado.
- **Validaciones:** formato de slug (`minusculas-con-guiones`) y aviso de slug duplicado.
- **Compatibilidad:** si la tabla `categories` no existe, el sitio funciona con una lista simple.
- **Favicon:** se toma del avatar de GitHub, así que se actualiza al cambiar la foto de perfil.

## Tecnologías

- HTML, CSS y JavaScript (módulos ES), sin paso de compilación
- [Supabase](https://supabase.com/) (PostgreSQL + API REST) mediante `supabase-js`
- [zero-md](https://github.com/zerodevx/zero-md) para renderizar Markdown
- [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) como editor en el panel
- [Bruno](https://www.usebruno.com/) para probar la API

## Estructura

| Ruta                  | Descripción                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `index.html`          | Visor público                                                                                    |
| `admin.html`          | Panel de administración                                                                          |
| `assets/js/config.js` | URL de Supabase y llave publicable                                                               |
| `assets/js/utils.js`  | Cliente Supabase y utilidades compartidas (consulta, orden, listado, escape de HTML)             |
| `assets/js/api.js`    | Lógica del visor                                                                                 |
| `assets/js/admin.js`  | Lógica del panel                                                                                 |
| `assets/css/`         | Estilos generales (`styles.css`), del panel (`admin.css`) y del Markdown (`markdown-styles.css`) |
| `assets/images/`      | Imágenes que usan los documentos                                                                 |
| `assets/bruno/`       | Colección de Bruno para listar y crear o actualizar documentos                                   |
| `db/schema.sql`       | Tablas `categories` y `documents`, índice y trigger de `updated_at`                              |
| `db/seed.sql`         | Datos de ejemplo (no ejecutar en producción)                                                     |
| `docs/adr/`           | Decisiones de arquitectura (ADR)                                                                 |
| `.gitattributes`      | Normaliza los saltos de línea a LF                                                               |

## Configuración

1. Ejecuta `db/schema.sql` en el SQL Editor de Supabase para crear el esquema.
2. Coloca la URL del proyecto y la llave publicable en `assets/js/config.js`.
3. Sirve la carpeta con cualquier servidor estático, por ejemplo `npx serve .`, o publícala en GitHub Pages.

### Categorías

Las categorías se crean directamente en la base de datos y desde el panel se asignan a cada documento:

```sql
INSERT INTO categories (name, slug, sort_order) VALUES ('Herramientas', 'herramientas', 1);
```

El menú se ordena por `sort_order` de la categoría y después por `sort_order` del documento. Los documentos sin categoría aparecen al final.

## Desarrollo

No hace falta instalar nada. Como el sitio usa módulos ES, se debe servir con un servidor local; abrir el HTML con doble clic no funciona:

```bash
python -m http.server 3000   # o "Open with Live Server" en VS Code
```

## Convenciones

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/es/) en una sola línea, en español y en minúsculas: `tipo(alcance): descripcion`. Tipos: `feat`, `fix`, `docs`, `style`, `refactor` y `chore`.
- **Código:** funciones y variables en español con camelCase (`listarDocumentos`), clases CSS en snake_case (`sidebar_list`). El texto que viene de la base pasa por `escapeHtml` antes de insertarse con `innerHTML`.
- **Formato:** `.editorconfig` (4 espacios, UTF-8) y `.gitattributes` (LF).
- **Base de datos:** todo cambio de esquema se refleja en `db/schema.sql` en el mismo commit.
- **Decisiones:** las de arquitectura se registran como [ADR](docs/adr/README.md) y los cambios en el [CHANGELOG](CHANGELOG.md).

## Seguridad

Ver [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE) © 2026 [Bernardo Quintino Guzmán](https://github.com/Bernardo-QG)
