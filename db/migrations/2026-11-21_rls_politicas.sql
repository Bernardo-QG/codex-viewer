-- =========================================================
-- Migración: políticas RLS para todas las tablas
-- Fecha: 2026-11-21
--
-- Deja las cuatro tablas con RLS activo y el mismo esquema de políticas:
--   - Lectura pública.
--   - Escritura con la llave publicable (anon), TEMPORAL mientras el panel
--     no tenga login. Ver docs/adr/0007-seguridad-con-llave-publicable-y-rls.md
--
-- Corrige:
--   - categories tenía RLS activo sin políticas: la API no podía leer secciones.
--   - tags y document_tags no tenían RLS.
--   - documents: "PermiteTodoPolicy" se reemplaza por políticas equivalentes
--     con nombre, separando lectura y escritura.
--
-- Es idempotente: se puede ejecutar más de una vez.
-- =========================================================

BEGIN;

DROP POLICY IF EXISTS "PermiteTodoPolicy" ON documents;

-- ---------- documents ----------
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_lectura_publica" ON documents;
CREATE POLICY "documents_lectura_publica" ON documents
    FOR SELECT TO anon, authenticated
    USING (true);

-- TEMPORAL: reemplazar por auth.uid() = '<uuid-del-autor>' al agregar login
DROP POLICY IF EXISTS "documents_escritura_temporal" ON documents;
CREATE POLICY "documents_escritura_temporal" ON documents
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

-- ---------- categories ----------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_lectura_publica" ON categories;
CREATE POLICY "categories_lectura_publica" ON categories
    FOR SELECT TO anon, authenticated
    USING (true);

-- TEMPORAL: reemplazar por auth.uid() = '<uuid-del-autor>' al agregar login
DROP POLICY IF EXISTS "categories_escritura_temporal" ON categories;
CREATE POLICY "categories_escritura_temporal" ON categories
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

-- ---------- tags ----------
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_lectura_publica" ON tags;
CREATE POLICY "tags_lectura_publica" ON tags
    FOR SELECT TO anon, authenticated
    USING (true);

-- TEMPORAL: reemplazar por auth.uid() = '<uuid-del-autor>' al agregar login
DROP POLICY IF EXISTS "tags_escritura_temporal" ON tags;
CREATE POLICY "tags_escritura_temporal" ON tags
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

-- ---------- document_tags ----------
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_tags_lectura_publica" ON document_tags;
CREATE POLICY "document_tags_lectura_publica" ON document_tags
    FOR SELECT TO anon, authenticated
    USING (true);

-- TEMPORAL: reemplazar por auth.uid() = '<uuid-del-autor>' al agregar login
DROP POLICY IF EXISTS "document_tags_escritura_temporal" ON document_tags;
CREATE POLICY "document_tags_escritura_temporal" ON document_tags
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

COMMIT;
