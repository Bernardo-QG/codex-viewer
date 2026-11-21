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
