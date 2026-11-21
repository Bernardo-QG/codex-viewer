# 0002. Sitio estático sin paso de compilación en GitHub Pages

- **Estado:** Aceptado
- **Fecha:** 2026-02-11

## Contexto

El proyecto es un visor de notas personales. Debe ser gratis de hospedar, fácil de modificar desde cualquier equipo y sencillo de mantener por una sola persona.

## Decisión

El sitio es HTML, CSS y JavaScript con módulos ES nativos, sin framework ni bundler. Las librerías se cargan desde un CDN (jsDelivr) y el sitio se publica con GitHub Pages directamente desde la rama `main`.

Las rutas internas son relativas (`./`, `admin.html`) porque el sitio vive en un subdirectorio (`/codex-viewer/`).

## Alternativas consideradas

- **Angular o React con Vite:** dan estructura y tipado, pero agregan un paso de compilación y dependencias que no se justifican para dos páginas.
- **Generador estático (Astro, Hugo):** es buena opción para contenido en archivos, pero el contenido se movió a base de datos (ver [0004](0004-supabase-como-almacenamiento.md)).

## Consecuencias

- Publicar es hacer push a `main`. No hay pipeline de build.
- Sin tipado, empaquetado ni dependencias locales: no hay `package.json` ni herramientas de Node. El formato lo define `.editorconfig` y la revisión es manual.
- Para probar en local basta un servidor estático (Live Server o `python -m http.server`).
- El sitio depende de la disponibilidad del CDN. Las versiones de EasyMDE están fijadas; las de zero-md y supabase-js se fijan por versión mayor.
