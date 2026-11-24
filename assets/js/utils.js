import { CONFIG } from './config.js';

export const SITE_NAME = 'Codex';

export const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/** Escapa texto para insertarlo en HTML sin riesgo de inyeccion. */
export function escapeHtml(valor) {
    return String(valor ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
}

/** Minusculas y sin acentos, para comparar y buscar. */
export function normalizar(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/** Convierte un texto en slug para URL: "Guia de Git" -> "guia-de-git". */
export function generarSlug(texto) {
    return normalizar(texto)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Slug del documento indicado en ?doc= de la URL. */
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

/** Agrupa las secciones por su padre, ordenadas; las que apuntan a un padre inexistente quedan en la raiz. */
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

// ---------- Arbol y orden de lectura ----------

/**
 * Arma el arbol del menu: documentos sin seccion primero y luego las secciones en orden.
 * Las secciones sin documentos (directos o en subsecciones) se descartan.
 * @returns {{ sueltos: Array, secciones: Array<{ categoria, hijos, docs }> }}
 */
export function construirArbol(documentos, categorias) {
    const porTitulo = (a, b) => porOrden(a, b) || a.title.localeCompare(b.title);
    const ids = new Set(categorias.map((c) => c.id));
    const hijos = agruparPorPadre(categorias);

    const docsPorCategoria = new Map();
    const sueltos = [];
    for (const doc of documentos) {
        if (doc.category_id == null || !ids.has(doc.category_id)) {
            sueltos.push(doc);
            continue;
        }
        if (!docsPorCategoria.has(doc.category_id)) docsPorCategoria.set(doc.category_id, []);
        docsPorCategoria.get(doc.category_id).push(doc);
    }

    const nodo = (categoria) => {
        const subsecciones = (hijos.get(categoria.id) ?? []).map(nodo).filter(Boolean);
        const docs = (docsPorCategoria.get(categoria.id) ?? []).sort(porTitulo);
        return subsecciones.length || docs.length ? { categoria, hijos: subsecciones, docs } : null;
    };

    return { sueltos: sueltos.sort(porTitulo), secciones: (hijos.get(null) ?? []).map(nodo).filter(Boolean) };
}

/** Documentos en el mismo orden en que aparecen en el menu (para anterior / siguiente). */
export function ordenDeLectura(documentos, categorias) {
    const { sueltos, secciones } = construirArbol(documentos, categorias);
    const orden = [...sueltos];
    const recorrer = ({ hijos, docs }) => {
        hijos.forEach(recorrer);
        orden.push(...docs);
    };
    secciones.forEach(recorrer);
    return orden;
}

// ---------- Render del menu ----------

const CLAVE_PLEGADAS = 'codex.secciones-plegadas';

/** Secciones que la persona dejo plegadas, guardadas en localStorage. */
function leerPlegadas() {
    try {
        return new Set(JSON.parse(localStorage.getItem(CLAVE_PLEGADAS)) ?? []);
    } catch {
        return new Set();
    }
}

/** Guarda en localStorage que secciones dejo plegadas la persona. Llamar una vez por lista. */
export function recordarSeccionesPlegadas(lista) {
    lista.addEventListener(
        'toggle',
        (evento) => {
            const seccion = evento.target.dataset?.seccion;
            if (!seccion || lista.dataset.filtrando) return;
            const plegadas = leerPlegadas();
            if (evento.target.open) plegadas.delete(seccion);
            else plegadas.add(seccion);
            try {
                localStorage.setItem(CLAVE_PLEGADAS, JSON.stringify([...plegadas]));
            } catch {
                /* almacenamiento no disponible: se ignora */
            }
        },
        true // "toggle" no burbujea
    );
}

/**
 * Genera el HTML del menu.
 * @param {object} [opciones]
 * @param {string} [opciones.hrefBase] pagina a la que apuntan los enlaces
 * @param {boolean} [opciones.todoAbierto] ignora las secciones plegadas (por ejemplo, al buscar)
 */
export function renderizarArbol(documentos, categorias, { hrefBase = '', todoAbierto = false } = {}) {
    const { sueltos, secciones } = construirArbol(documentos, categorias);
    const plegadas = todoAbierto ? new Set() : leerPlegadas();

    const item = (doc) => {
        const borrador = doc.status === 'draft' ? ' <span class="badge_draft">Borrador</span>' : '';
        return `<li><a href="${hrefBase}?doc=${encodeURIComponent(doc.slug)}" data-slug="${escapeHtml(doc.slug)}">${escapeHtml(doc.title)}${borrador}</a></li>`;
    };

    const seccion = ({ categoria, hijos, docs }) => `
        <li class="tree_section">
            <details data-seccion="${escapeHtml(categoria.slug)}"${plegadas.has(categoria.slug) ? '' : ' open'}>
                <summary>${escapeHtml(categoria.name)}</summary>
                <ul class="tree_items">${hijos.map(seccion).join('')}${docs.map(item).join('')}</ul>
            </details>
        </li>`;

    return sueltos.map(item).join('') + secciones.map(seccion).join('');
}

/** Resalta en el menu el documento activo y abre las secciones que lo contienen. */
export function marcarActivo(lista, slug, { desplazar = false } = {}) {
    lista.querySelectorAll('li.active').forEach((li) => li.classList.remove('active'));
    if (!slug) return;
    const enlace = lista.querySelector(`a[data-slug="${CSS.escape(slug)}"]`);
    if (!enlace) return;
    enlace.parentElement.classList.add('active');
    enlace.setAttribute('aria-current', 'page');
    lista.querySelectorAll('a[aria-current]').forEach((a) => a !== enlace && a.removeAttribute('aria-current'));
    // Abre las secciones que contienen al documento activo
    for (let d = enlace.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    if (desplazar) enlace.scrollIntoView?.({ block: 'nearest' });
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
