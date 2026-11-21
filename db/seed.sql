-- =========================================================
-- Datos de ejemplo (NO ejecutar en producción)
-- Muestra secciones anidadas, etiquetas, borradores y resúmenes.
-- =========================================================

-- Secciones de primer nivel
INSERT INTO categories (name, slug, sort_order) VALUES
    ('Inicio', 'inicio', 0),
    ('Desarrollo', 'desarrollo', 1),
    ('Herramientas', 'herramientas', 2);

-- Subsecciones: se enlazan al padre por su slug
INSERT INTO categories (parent_id, name, slug, sort_order)
SELECT id, 'Backend', 'backend', 0 FROM categories WHERE slug = 'desarrollo'
UNION ALL
SELECT id, 'Frontend', 'frontend', 1 FROM categories WHERE slug = 'desarrollo';

-- Documentos
INSERT INTO documents (title, slug, summary, content, status, category_id, sort_order)
SELECT '¡Hola mundo!', 'hola-mundo', 'Qué es Codex y cómo está organizado.',
       E'# Hola mundo\nEste es el contenido de mi archivo markdown.', 'published', id, 0
FROM categories WHERE slug = 'inicio'
UNION ALL
SELECT 'Comandos GIT', 'git', 'Comandos de Git que uso a diario: stash, checkout y limpieza.',
       E'# Comandos GIT\n\n## Stash\n\n```bash\ngit stash -m "mensaje"\n```', 'published', id, 0
FROM categories WHERE slug = 'herramientas'
UNION ALL
SELECT 'Spring Boot: estructura', 'spring-boot-estructura', 'Cómo organizo un microservicio.',
       E'# Spring Boot\n\n> En proceso de redacción...', 'draft', id, 0
FROM categories WHERE slug = 'backend';

-- Etiquetas
INSERT INTO tags (name, slug) VALUES ('git', 'git'), ('java', 'java'), ('spring', 'spring');

INSERT INTO document_tags (document_id, tag_id)
SELECT d.id, t.id
FROM documents d
JOIN tags t ON (d.slug, t.slug) IN (('git', 'git'), ('spring-boot-estructura', 'java'), ('spring-boot-estructura', 'spring'));
