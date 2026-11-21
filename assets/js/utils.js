import { CONFIG } from './config.js';

export const SITE_NAME = 'Codex';

export const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export function escapeHtml(valor) {
    return String(valor ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
}

export function normalizar(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

export function generarSlug(texto) {
    return normalizar(texto)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export function obtenerSlugDeURL() {
    return new URLSearchParams(window.location.search).get('doc');
}

// ---------- Consulta ----------

/**
 * Trae documentos (con etiquetas) y secciones.
 * Si la migracion de secciones y etiquetas aun no se aplica, cae a una lista simple.
 * @returns {{ documentos: Array, categorias: Array, completo: boolean, error: object|null }}
 */
export async function obtenerContenido({ incluirBorradores = false } = {}) {
    let consultaDocs = sb
        .from('documents')
        .select('id, title, slug, summary, status, sort_order, category_id, tags(name, slug)');
    if (!incluirBorradores) consultaDocs = consultaDocs.eq('status', 'published');

    const [docs, cats] = await Promise.all([
        consultaDocs,
        sb.from('categories').select('id, parent_id, name, slug, description, sort_order')
    ]);

    if (!docs.error && !cats.error) {
        const categorias = cats.data;
        const documentos = docs.data.map((doc) => ({ ...doc, ruta: rutaDeCategoria(categorias, doc.category_id) }));
        return { documentos, categorias, completo: true, error: null };
    }

    const simple = await sb.from('documents').select('id, title, slug').order('id', { ascending: true });
    const documentos = (simple.data ?? []).map((doc) => ({ ...doc, tags: [], ruta: [] }));
    return { documentos, categorias: [], completo: false, error: simple.error };
}

// ---------- Secciones ----------

/** Secciones desde la raiz hasta la seccion indicada: [Desarrollo, Backend] */
export function rutaDeCategoria(categorias, id) {
    const porId = new Map(categorias.map((c) => [c.id, c]));
    const ruta = [];
    const vistos = new Set();
    let actual = porId.get(id);
    while (actual && !vistos.has(actual.id)) {
        vistos.add(actual.id);
        ruta.unshift(actual);
        actual = porId.get(actual.parent_id);
    }
    return ruta;
}

const porOrden = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

/** Lista plana del arbol con su profundidad, en orden de lectura. Util para un <select>. */
export function aplanarCategorias(categorias) {
    const hijos = agruparPorPadre(categorias);
    const resultado = [];
    const recorrer = (padreId, nivel) => {
        for (const c of hijos.get(padreId) ?? []) {
            resultado.push({ ...c, nivel });
            recorrer(c.id, nivel + 1);
        }
    };
    recorrer(null, 0);
    return resultado;
}

function agruparPorPadre(categorias) {
    const hijos = new Map();
    const ids = new Set(categorias.map((c) => c.id));
    for (const c of categorias) {
        const padre = ids.has(c.parent_id) ? c.parent_id : null;
        if (!hijos.has(padre)) hijos.set(padre, []);
        hijos.get(padre).push(c);
    }
    for (const lista of hijos.values()) lista.sort((a, b) => porOrden(a, b) || a.name.localeCompare(b.name));
    return hijos;
}

// ---------- Render del menu ----------

/**
 * Genera el HTML del menu: documentos sin seccion primero y luego el arbol de secciones.
 * Las secciones sin documentos (directos o en subsecciones) no se muestran.
 */
export function renderizarArbol(documentos, categorias, hrefBase = '') {
    const docsPorCategoria = new Map();
    for (const doc of documentos) {
        const clave = doc.category_id ?? null;
        if (!docsPorCategoria.has(clave)) docsPorCategoria.set(clave, []);
        docsPorCategoria.get(clave).push(doc);
    }
    for (const lista of docsPorCategoria.values()) lista.sort((a, b) => porOrden(a, b) || a.title.localeCompare(b.title));

    const ids = new Set(categorias.map((c) => c.id));
    const hijos = agruparPorPadre(categorias);

    const item = (doc) => {
        const borrador = doc.status === 'draft' ? ' <span class="badge_draft">Borrador</span>' : '';
        return `<li><a href="${hrefBase}?doc=${encodeURIComponent(doc.slug)}" data-slug="${escapeHtml(doc.slug)}">${escapeHtml(doc.title)}${borrador}</a></li>`;
    };

    const seccion = (cat) => {
        const contenido = (hijos.get(cat.id) ?? []).map(seccion).join('') + (docsPorCategoria.get(cat.id) ?? []).map(item).join('');
        if (!contenido) return '';
        return `<li class="tree_section">
            <details open>
                <summary>${escapeHtml(cat.name)}</summary>
                <ul class="tree_items">${contenido}</ul>
            </details>
        </li>`;
    };

    // Documentos sin seccion o con una seccion que ya no existe
    const sueltos = documentos.filter((d) => d.category_id == null || !ids.has(d.category_id));
    sueltos.sort((a, b) => porOrden(a, b) || a.title.localeCompare(b.title));

    return sueltos.map(item).join('') + (hijos.get(null) ?? []).map(seccion).join('');
}

export function marcarActivo(lista, slug) {
    lista.querySelectorAll('li.active').forEach((li) => li.classList.remove('active'));
    if (!slug) return;
    const enlace = lista.querySelector(`a[data-slug="${CSS.escape(slug)}"]`);
    if (!enlace) return;
    enlace.parentElement.classList.add('active');
    // Abre las secciones que contienen al documento activo
    for (let d = enlace.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
}

// ---------- Busqueda ----------

/** Filtra por texto (titulo, resumen, seccion o etiqueta) o por etiqueta exacta con "#etiqueta". */
export function filtrarDocumentos(documentos, termino) {
    const t = normalizar(termino.trim());
    if (!t) return documentos;

    if (t.startsWith('#')) {
        const etiqueta = t.slice(1);
        return documentos.filter((d) => (d.tags ?? []).some((tag) => tag.slug === etiqueta || normalizar(tag.name) === etiqueta));
    }

    return documentos.filter((d) =>
        [d.title, d.summary, ...(d.ruta ?? []).map((c) => c.name), ...(d.tags ?? []).map((tag) => tag.name)].some((v) =>
            normalizar(v).includes(t)
        )
    );
}
