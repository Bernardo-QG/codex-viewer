# Changelog

Todos los cambios relevantes del proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado

- ADRs en `docs/adr/` con las decisiones de arquitectura del proyecto.
- Política de seguridad, licencia MIT y `.editorconfig`.
- Imagen para vista previa al compartir el enlace (`og:image`).
- Búsqueda de documentos en el menú lateral, con atajo `/`.
- Índice de cada documento que resalta la sección visible.
- Botón para copiar los bloques de código.
- Fecha de última actualización en cada documento.
- README en inglés con diagrama de arquitectura y versión en español (`README.es.md`).
- Secciones anidadas: el menú muestra un árbol plegable y cada documento su ruta (Desarrollo › Backend).
- Etiquetas por documento; al hacer clic en una se filtra el menú, y en la búsqueda funciona `#etiqueta`.
- Estado borrador/publicado. Los borradores solo se ven en el panel o con `?preview=1`.
- Resumen por documento: se muestra bajo el título y se usa en la búsqueda y en la meta `description`.
- Migración `db/migrations/2026-11-21_secciones_etiquetas_estado.sql` y ADR 0008.
- Anterior / siguiente al final de cada documento y atajos `←` `→`.
- Los enlaces entre documentos (`?doc=`, `#ancla` o `archivo.md`) abren sin recargar; los externos, en otra pestaña.
- Tema claro / oscuro con botón en la barra superior, que respeta la preferencia del sistema.
- Barra de progreso de lectura, esqueleto de carga y aparición suave del contenido.
- El menú recuerda las secciones plegadas, se desplaza al documento activo y en móvil se cierra con un fondo oscurecido o con `Esc`.
- Pestañas en el panel para administrar secciones (crear, anidar, ordenar, describir y eliminar) y etiquetas (crear, renombrar, eliminar y quitar las que no se usan), con el número de documentos de cada una.

### Cambiado

- Nueva tipografía de lectura (Roboto + JetBrains Mono), texto alineado a la izquierda y resaltado de código con colores en ambos temas.
- Se oculta el primer `# título` del Markdown cuando repite el título del documento.
- El panel guarda por `id` en lugar de `slug` y agrega estado, resumen, sección con sangría y etiquetas con autocompletado.

### Corregido

- Los enlaces e imágenes relativos del Markdown se resolvían contra una URL `data:` y quedaban rotos.

## [1.0.0] - 2026-11-21

### Agregado

- El menú lateral agrupa los documentos por categoría y los ordena con `sort_order`.
- El panel permite asignar categoría y orden, y tiene un enlace "Ver publicado".
- El panel valida el formato del slug y avisa si está duplicado.
- El favicon se toma del avatar de GitHub.
- `.gitattributes` normaliza los saltos de línea a LF.

### Cambiado

- La marca pasa de "Desarrollo TI 55" a "Codex", en la cuenta Bernardo-QG.
- La lógica compartida se extrajo a `assets/js/utils.js`.
- Se reescribió el README.

### Corregido

- El HTML de títulos y slugs se escapa en los listados.
- Una respuesta lenta ya no sobrescribe al documento abierto después.
- El enlace del logo funciona en GitHub Pages.
- El historial del navegador ya no agrega una entrada extra al cargar.
- El panel ya no registra listeners duplicados ni permite el doble envío al guardar.

### Eliminado

- El favicon local `assets/icons/favicon-32x32.png`.

[Sin publicar]: https://github.com/Bernardo-QG/codex-viewer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Bernardo-QG/codex-viewer/releases/tag/v1.0.0
