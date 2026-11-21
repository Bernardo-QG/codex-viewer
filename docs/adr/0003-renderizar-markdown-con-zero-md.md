# 0003. Renderizar Markdown en el cliente con zero-md

- **Estado:** Aceptado
- **Fecha:** 2026-02-12

## Contexto

Los documentos se escriben en Markdown y se deben mostrar con resaltado de código y estilos propios, sin convertirlos a HTML antes de publicarlos.

## Decisión

Usamos el web component [zero-md](https://github.com/zerodevx/zero-md) (v2). El contenido se le pasa como `data:` URL en base64, y los estilos propios se inyectan con `<template data-append>` apuntando a `assets/css/markdown-styles.css`.

## Alternativas consideradas

- **marked + highlight.js a mano:** da más control, pero hay que integrar y sanitizar por cuenta propia.
- **Convertir a HTML al guardar:** el contenido quedaría duplicado (Markdown y HTML) en la base.

## Consecuencias

- Una sola etiqueta resuelve el render, el resaltado y el aislamiento de estilos (Shadow DOM).
- Los estilos del Markdown viven aparte de los del sitio y no se mezclan.
- El HTML incrustado en un documento se renderiza. Como solo el autor escribe documentos, se acepta. Si algún día otras personas editan, hay que revisar la sanitización.
