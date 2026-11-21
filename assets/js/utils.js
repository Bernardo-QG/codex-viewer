import { CONFIG } from './config.js';

export const SITE_NAME = 'Codex';

export const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const SIN_CATEGORIA = 'Sin categoría';

export function escapeHtml(valor) {
    return String(valor ?? '').replace(
        /[&<>"']/g,
        (c) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[c]
    );
}

export function obtenerSlugDeURL() {
    return new URLSearchParams(window.location.search).get('doc');
}

/**
 * Obtiene la lista de documentos con su categoria.
 * Si la tabla categories aun no existe en la base, cae a la consulta simple.
 * @returns {{ data: Array, error: object|null, conCategorias: boolean }}
 */
export async function obtenerDocumentos() {
    const conCategorias = await sb
        .from('documents')
        .select('id, title, slug, sort_order, category_id, category:categories(name, sort_order)');

    if (!conCategorias.error) {
        return { data: ordenarDocumentos(conCategorias.data), error: null, conCategorias: true };
    }

    const simple = await sb.from('documents').select('id, title, slug').order('id', { ascending: true });

    return { data: simple.data ?? [], error: simple.error, conCategorias: false };
}

function ordenarDocumentos(documentos) {
    const infinito = Number.MAX_SAFE_INTEGER;
    return [...documentos].sort(
        (a, b) =>
            (a.category?.sort_order ?? infinito) - (b.category?.sort_order ?? infinito) ||
            (a.category?.name ?? '').localeCompare(b.category?.name ?? '') ||
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            a.title.localeCompare(b.title)
    );
}

/** Genera el HTML del listado, agrupado por categoria cuando hay mas de un grupo. */
export function renderizarLista(documentos, hrefBase = '') {
    const item = (doc) =>
        `<li><a href="${hrefBase}?doc=${encodeURIComponent(doc.slug)}" data-slug="${escapeHtml(doc.slug)}">${escapeHtml(doc.title)}</a></li>`;

    const grupos = new Map();
    for (const doc of documentos) {
        const nombre = doc.category?.name ?? SIN_CATEGORIA;
        if (!grupos.has(nombre)) grupos.set(nombre, []);
        grupos.get(nombre).push(doc);
    }

    if (grupos.size <= 1) return documentos.map(item).join('');

    return [...grupos]
        .map(
            ([nombre, docs]) => `
        <li class="list_group">
            <span class="list_group_title">${escapeHtml(nombre)}</span>
            <ul class="list_group_items">${docs.map(item).join('')}</ul>
        </li>`
        )
        .join('');
}

export function marcarActivo(lista, slug) {
    lista.querySelectorAll('li.active').forEach((li) => li.classList.remove('active'));
    if (!slug) return;
    const enlace = lista.querySelector(`a[data-slug="${CSS.escape(slug)}"]`);
    if (enlace) enlace.parentElement.classList.add('active');
}
