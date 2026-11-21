# 0001. Registrar decisiones de arquitectura con ADR

- **Estado:** Aceptado
- **Fecha:** 2026-11-21

## Contexto

El proyecto ha cambiado de enfoque varias veces (archivos Markdown en el repo, luego base de datos, luego categorías). El motivo de cada cambio solo quedaba en los mensajes de commit y en la memoria del autor.

## Decisión

Registramos cada decisión de arquitectura relevante como un ADR (Architecture Decision Record) en `docs/adr/`, con el formato de Michael Nygard: contexto, decisión, alternativas y consecuencias.

- Los archivos se numeran de forma consecutiva: `NNNN-titulo-en-kebab-case.md`.
- Un ADR aceptado no se reescribe. Si la decisión cambia, se crea uno nuevo y el anterior pasa a "Reemplazado por".
- Se parte de [`template.md`](template.md) y se agrega al índice en [`README.md`](README.md).

## Alternativas consideradas

- **Solo mensajes de commit:** no explican alternativas ni consecuencias y son difíciles de encontrar.
- **Wiki de GitHub:** queda fuera del repositorio y no se versiona junto con el código.

## Consecuencias

- El porqué de cada decisión queda junto al código y se revisa en los mismos PR.
- Hay que acordarse de escribir el ADR al tomar una decisión importante.
- Los ADR 0002 a 0006 documentan después del hecho decisiones ya tomadas, reconstruidas a partir del historial de Git.
