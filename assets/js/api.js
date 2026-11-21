import {
    SITE_NAME,
    sb,
    escapeHtml,
    generarSlug,
    obtenerSlugDeURL,
    obtenerContenido,
    rutaDeCategoria,
    renderizarArbol,
    filtrarDocumentos,
    marcarActivo
} from './utils.js';

const lista = document.getElementById('document_list');
const busqueda = document.getElementById('search');
const loading = document.getElementById('loading');
const content = document.getElementById('content');
const titulo = document.getElementById('document_title');
const ruta = document.getElementById('document_path');
const resumen = document.getElementById('document_summary');
const etiquetas = document.getElementById('document_tags');
const etiquetaActualizado = document.getElementById('document_updated');
const metaDescripcion = document.querySelector('meta[name="description"]');
const descripcionSitio = metaDescripcion.content;
const toc = document.getElementById('toc');
const tocLista = document.getElementById('toc_list');

const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });
// ?preview=1 permite ver borradores (lo usa el enlace "Ver" del panel)
const modoPreview = new URLSearchParams(window.location.search).has('preview');

let documentos = [];
let categorias = [];
let peticionActual = 0;
let observadorToc = null;

function encodeMarkdown(str) {
    return 'data:text/markdown;base64,' + btoa(unescape(encodeURIComponent(str)));
}

function navegarA(slug, { reemplazar = false } = {}) {
    const url = new URL(window.location);
    url.searchParams.set('doc', slug);
    window.history[reemplazar ? 'replaceState' : 'pushState']({}, '', url);
    mostrarDocumentoPorSlug(slug);
}

// ---------- Menu y busqueda ----------

function pintarLista() {
    const visibles = filtrarDocumentos(documentos, busqueda.value);
    lista.innerHTML = visibles.length
        ? renderizarArbol(visibles, categorias)
        : '<li class="list_empty">Sin resultados</li>';
    marcarActivo(lista, obtenerSlugDeURL());
}

function primerDocumentoVisible() {
    return lista.querySelector('a[data-slug]')?.dataset.slug;
}

async function cargarContenido() {
    const resultado = await obtenerContenido({ incluirBorradores: modoPreview });

    if (resultado.error) {
        lista.innerHTML = '<li class="list_error">No se pudo cargar la lista.</li>';
        return;
    }

    documentos = resultado.documentos;
    categorias = resultado.categorias;
    pintarLista();
}

function buscarEtiqueta(slug) {
    busqueda.value = `#${slug}`;
    pintarLista();
    document.getElementById('sidebar').classList.add('open');
    busqueda.focus();
}

// ---------- Documento ----------

async function consultarDocumento(slug) {
    const completo = await sb
        .from('documents')
        .select('title, slug, summary, content, status, category_id, updated_at, tags(name, slug)')
        .eq('slug', slug)
        .single();
    // Si la migracion aun no se aplica, se consulta solo lo basico
    if (completo.error && completo.error.code !== 'PGRST116') {
        return sb.from('documents').select('title, slug, content').eq('slug', slug).single();
    }
    return completo;
}

function pintarRuta(categoryId, esBorrador) {
    const secciones = rutaDeCategoria(categorias, categoryId);
    const borrador = esBorrador ? '<span class="badge_draft">Borrador</span>' : '';
    ruta.innerHTML = secciones.map((c) => `<span>${escapeHtml(c.name)}</span>`).join('<span aria-hidden="true">›</span>') + borrador;
    ruta.hidden = !ruta.innerHTML;
}

function pintarEtiquetas(tags = []) {
    etiquetas.hidden = !tags.length;
    etiquetas.innerHTML = tags
        .map((t) => `<li><button type="button" data-tag="${escapeHtml(t.slug)}">#${escapeHtml(t.name)}</button></li>`)
        .join('');
}

function mostrarNoEncontrado() {
    titulo.textContent = 'Documento no encontrado';
    ruta.hidden = true;
    resumen.hidden = true;
    etiquetas.hidden = true;
    etiquetaActualizado.hidden = true;
    content.src = encodeMarkdown('# 404\nEl documento solicitado no existe.');
    document.title = `No encontrado — ${SITE_NAME}`;
    metaDescripcion.content = descripcionSitio;
}

async function mostrarDocumentoPorSlug(slug) {
    // Evita que una respuesta lenta sobrescriba un documento abierto despues
    const peticion = ++peticionActual;

    loading.hidden = false;
    content.hidden = true;
    toc.hidden = true;
    marcarActivo(lista, slug);

    const { data, error } = await consultarDocumento(slug);

    if (peticion !== peticionActual) return;

    loading.hidden = true;
    content.hidden = false;

    const esBorrador = data?.status === 'draft';
    if (error || (esBorrador && !modoPreview)) {
        mostrarNoEncontrado();
        return;
    }

    titulo.textContent = data.title;
    pintarRuta(data.category_id, esBorrador);

    resumen.hidden = !data.summary;
    resumen.textContent = data.summary ?? '';
    metaDescripcion.content = data.summary || descripcionSitio;

    pintarEtiquetas(data.tags);

    etiquetaActualizado.hidden = !data.updated_at;
    if (data.updated_at) {
        etiquetaActualizado.textContent = `Actualizado el ${formatoFecha.format(new Date(data.updated_at))}`;
    }

    content.src = encodeMarkdown(data.content);
    document.title = `${data.title} — ${SITE_NAME}`;
    window.scrollTo({ top: 0 });
}

// ---------- Indice y botones de copiar (dentro del Shadow DOM de zero-md) ----------

function construirIndice(raiz) {
    observadorToc?.disconnect();

    const encabezados = [...raiz.querySelectorAll('h2, h3')];
    toc.hidden = encabezados.length < 2;
    if (toc.hidden) {
        tocLista.innerHTML = '';
        return;
    }

    const usados = new Set();
    tocLista.innerHTML = '';
    for (const h of encabezados) {
        let id = h.id || generarSlug(h.textContent) || 'seccion';
        while (usados.has(id)) id += '-1';
        usados.add(id);
        h.id = id;

        const li = document.createElement('li');
        li.className = `toc_item toc_${h.tagName.toLowerCase()}`;
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = h.textContent;
        a.addEventListener('click', (evento) => {
            evento.preventDefault();
            h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        li.append(a);
        tocLista.append(li);
    }

    // Resalta la seccion visible
    observadorToc = new IntersectionObserver(
        (entradas) => {
            const visible = entradas.find((e) => e.isIntersecting);
            if (!visible) return;
            tocLista.querySelectorAll('a').forEach((a) => {
                a.classList.toggle('active', a.getAttribute('href') === `#${visible.target.id}`);
            });
        },
        { rootMargin: '-70px 0px -70% 0px' }
    );
    encabezados.forEach((h) => observadorToc.observe(h));
}

function agregarBotonesCopiar(raiz) {
    raiz.querySelectorAll('pre').forEach((pre) => {
        if (pre.querySelector('.copy_button')) return;
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'copy_button';
        boton.textContent = 'Copiar';
        boton.setAttribute('aria-label', 'Copiar código');
        boton.addEventListener('click', async () => {
            const codigo = pre.querySelector('code')?.innerText ?? pre.innerText;
            try {
                await navigator.clipboard.writeText(codigo);
                boton.textContent = 'Copiado';
            } catch {
                boton.textContent = 'Error';
            }
            setTimeout(() => (boton.textContent = 'Copiar'), 1500);
        });
        pre.append(boton);
    });
}

content.addEventListener('zero-md-rendered', () => {
    const raiz = content.shadowRoot;
    if (!raiz) return;
    construirIndice(raiz);
    agregarBotonesCopiar(raiz);
});

// ---------- Navegacion ----------

function mostrarInicial() {
    const slug = obtenerSlugDeURL() ?? primerDocumentoVisible();
    if (!slug) {
        loading.textContent = 'Aún no hay documentos.';
        return;
    }
    if (obtenerSlugDeURL()) mostrarDocumentoPorSlug(slug);
    else navegarA(slug, { reemplazar: true });
}

function cerrarSidebar() {
    document.getElementById('sidebar').classList.remove('open');
}

function configurarEventos() {
    const sidebar = document.getElementById('sidebar');
    document.getElementById('menu_button').addEventListener('click', () => sidebar.classList.add('open'));
    document.getElementById('sidebar_toggle').addEventListener('click', cerrarSidebar);

    lista.addEventListener('click', (evento) => {
        const enlace = evento.target.closest('a[data-slug]');
        if (!enlace) return;
        evento.preventDefault();
        if (enlace.dataset.slug !== obtenerSlugDeURL()) navegarA(enlace.dataset.slug);
        cerrarSidebar();
    });

    etiquetas.addEventListener('click', (evento) => {
        const boton = evento.target.closest('button[data-tag]');
        if (boton) buscarEtiqueta(boton.dataset.tag);
    });

    busqueda.addEventListener('input', pintarLista);
    busqueda.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            const primero = primerDocumentoVisible();
            if (primero) {
                navegarA(primero);
                cerrarSidebar();
            }
        } else if (evento.key === 'Escape') {
            busqueda.value = '';
            pintarLista();
            busqueda.blur();
        }
    });

    // "/" enfoca la busqueda, como en GitHub
    document.addEventListener('keydown', (evento) => {
        if (evento.key !== '/' || evento.target.matches('input, textarea')) return;
        evento.preventDefault();
        sidebar.classList.add('open');
        busqueda.focus();
    });

    window.addEventListener('popstate', mostrarInicial);
}

window.addEventListener('DOMContentLoaded', async () => {
    configurarEventos();
    await cargarContenido();
    mostrarInicial();
});
