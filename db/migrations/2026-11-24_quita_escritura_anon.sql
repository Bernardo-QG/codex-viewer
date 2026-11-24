-- =========================================================
-- Migración: quita la escritura con la llave publicable (anon)
-- Fecha: 2026-11-24
--
-- Las políticas *_escritura_temporal permitían a anon insertar, editar y
-- borrar en todas las tablas. Como la llave publicable está en el JS del
-- sitio, cualquiera podía modificar o vaciar el contenido.
--
-- Ahora solo un usuario autenticado puede escribir. Mientras el panel no
-- tenga login, el contenido se edita desde el panel de Supabase.
-- Ver docs/adr/0007-seguridad-con-llave-publicable-y-rls.md
--
-- Es idempotente: se puede ejecutar más de una vez.
-- =========================================================

BEGIN;

DROP POLICY IF EXISTS "documents_escritura_temporal" ON documents;
DROP POLICY IF EXISTS "documents_escritura_autenticados" ON documents;
CREATE POLICY "documents_escritura_autenticados" ON documents
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "categories_escritura_temporal" ON categories;
DROP POLICY IF EXISTS "categories_escritura_autenticados" ON categories;
CREATE POLICY "categories_escritura_autenticados" ON categories
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tags_escritura_temporal" ON tags;
DROP POLICY IF EXISTS "tags_escritura_autenticados" ON tags;
CREATE POLICY "tags_escritura_autenticados" ON tags
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "document_tags_escritura_temporal" ON document_tags;
DROP POLICY IF EXISTS "document_tags_escritura_autenticados" ON document_tags;
CREATE POLICY "document_tags_escritura_autenticados" ON document_tags
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

COMMIT;
