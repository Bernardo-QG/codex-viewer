# 0005. EasyMDE como editor del panel de administración

- **Estado:** Aceptado
- **Fecha:** 2026-07-27

## Contexto

El panel necesita un editor cómodo para Markdown: barra de herramientas, atajos y conteo de palabras, sin agregar compilación al proyecto.

## Decisión

Usamos [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) 2.18.0 desde CDN, con el autosave desactivado y estilos sobrescritos para el tema oscuro en `admin.css`.

## Alternativas consideradas

- **`<textarea>` simple:** sin ayudas de formato.
- **Monaco o CodeMirror 6 directo:** son más potentes, pero hay que configurar mucho más y su carga es más pesada.
- **Toast UI Editor:** incluye un modo WYSIWYG que no se necesita.

## Consecuencias

- Se integra con una etiqueta `<script>` y una línea de JavaScript.
- La vista previa de EasyMDE no usa los mismos estilos que zero-md, así que el resultado final se revisa con "Ver publicado".
