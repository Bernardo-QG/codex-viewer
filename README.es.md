# Codex

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/18334613?s=400&u=e7bdce3bde7c8aaca98e291e31f7fc2911203d8f&v=4" alt="Bernardo Quintino Guzmán" width="200" style="border-radius: 50%;" />
</p>

<p align="center">
  Base de conocimiento en Markdown con panel de administración, sobre Supabase y publicada como sitio estático.<br />
  <a href="https://bernardo-qg.github.io/codex-viewer/"><strong>Ver sitio</strong></a> ·
  <a href="docs/adr/README.md">Decisiones de arquitectura</a> ·
  <a href="README.md">Read in English</a>
</p>

## Funcionalidades

**Visor**

- Documentos agrupados por categoría en el menú lateral, con orden manual
- Búsqueda instantánea por título o categoría (`/` para enfocar, `Enter` para abrir, `Esc` para limpiar)
- Índice de cada documento que resalta la sección que estás leyendo
- Botón para copiar los bloques de código
- Fecha de última actualización en cada documento
- Navegación sin recargar con URLs para compartir (`?doc=<slug>`), botones de atrás y adelante funcionando y diseño adaptable a móvil

**Panel de administración** (`admin.html`)

- Crear, editar y eliminar documentos con editor Markdown
- Asignar categoría y orden, y abrir la página publicada con un clic
- Validación del formato del slug y aviso claro si está duplicado

## Arquitectura

```mermaid
flowchart LR
    subgraph Navegador["Navegador · GitHub Pages"]
        V["index.html<br/>Visor"]
        A["admin.html<br/>Panel"]
    end
    subgraph Supabase
        R["API REST<br/>PostgREST"]
        DB[("PostgreSQL<br/>documents · categories")]
    end
    CDN["CDN jsDelivr<br/>zero-md · EasyMDE · supabase-js"]

    V -- "lectura" --> R
    A -- "alta · cambio · baja" --> R
    R --> DB
    CDN -.-> V
    CDN -.-> A
```

No hay backend ni paso de compilación: dos páginas HTML consultan directamente la API REST que genera Supabase, y GitHub Pages publica los archivos tal cual.

Cada decisión está documentada como [ADR](docs/adr/README.md): sitio estático, render de Markdown en el cliente, Supabase como almacenamiento, categorías en tabla aparte y seguridad con RLS.

### Notas de ingeniería

- **Render seguro contra XSS:** todo valor de la base que se inserta con `innerHTML` se escapa.
- **Protección contra condiciones de carrera:** un contador de peticiones evita que una respuesta lenta sobrescriba un documento abierto después.
- **Degradación elegante:** si falta una columna o tabla nueva, se usa una consulta más simple en lugar de fallar.
- **Integración con Shadow DOM:** el índice y los botones de copiar se construyen sobre el resultado de zero-md con su evento `zero-md-rendered`.

## Tecnologías

HTML · CSS · JavaScript (módulos ES) · [Supabase](https://supabase.com/) · [zero-md](https://github.com/zerodevx/zero-md) · [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) · [Bruno](https://www.usebruno.com/) · GitHub Pages

## Estructura

```
├── index.html            Visor
├── admin.html            Panel de administración
├── assets/
│   ├── js/
│   │   ├── config.js     URL de Supabase y llave publicable
│   │   ├── utils.js      Cliente compartido, consulta, orden, listado y escape de HTML
│   │   ├── api.js        Lógica del visor: búsqueda, índice y botones de copiar
│   │   └── admin.js      Lógica del panel
│   ├── css/              Estilos del sitio, del panel y del Markdown
│   ├── images/           Imágenes que usan los documentos
│   └── bruno/            Colección de la API para Bruno
├── db/
│   ├── schema.sql        Tablas, índice y trigger de updated_at
│   └── seed.sql          Datos de ejemplo
└── docs/adr/             Decisiones de arquitectura
```

## Cómo empezar

1. Crea un proyecto en Supabase y ejecuta `db/schema.sql` en el SQL Editor.
2. Coloca la URL del proyecto y la llave publicable en `assets/js/config.js`.
3. Sirve la carpeta en local. Los módulos ES no cargan desde `file://`:

   ```bash
   python -m http.server 3000   # o "Open with Live Server" en VS Code
   ```

4. Abre http://localhost:3000. Los documentos se administran en `/admin.html`; las categorías se crean por SQL:

   ```sql
   INSERT INTO categories (name, slug, sort_order) VALUES ('Herramientas', 'herramientas', 1);
   ```

## Pendientes

- [ ] Login del panel con Supabase Auth y Row Level Security ([ADR 0007](docs/adr/0007-seguridad-con-llave-publicable-y-rls.md))
- [ ] Respaldo programado de los documentos en archivos Markdown
- [ ] Administración de categorías y subida de imágenes desde el panel

## Convenciones

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/es/) en una sola línea, en español y en minúsculas: `tipo(alcance): descripcion`.
- **Código:** funciones y variables en español con camelCase (`listarDocumentos`), clases CSS en snake_case (`sidebar_list`).
- **Formato:** `.editorconfig` (4 espacios, UTF-8) y `.gitattributes` (LF).
- **Esquema:** todo cambio se refleja en `db/schema.sql` en el mismo commit; los cambios relevantes van al [CHANGELOG](CHANGELOG.md).

## Seguridad

Ver [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE) © 2026 [Bernardo Quintino Guzmán](https://github.com/Bernardo-QG)
