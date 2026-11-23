import {
    SITE_NAME,
    sb,
    escapeHtml,
    normalizar,
    generarSlug,
    obtenerSlugDeURL,
    obtenerContenido,
    rutaDeCategoria,
    renderizarArbol,
    ordenDeLectura,
    filtrarDocumentos,
    marcarActivo,
    recordarSeccionesPlegadas
} from './utils.js';

const $ = (id) => document.getElementById(id);
const sidebar = $('sidebar');
const lista = $('document_list');
const busqueda = $('search');
const loading = $('loading');
const content = $('content');
const titulo = $('document_title');
const ruta = $('document_path');
const resumen = $('document_summary');
const etiquetas = $('document_tags');
const etiquetaActualizado = $('document_updated');
const pager = $('pager');
const progreso = $('progress');
const toc = $('toc');
const tocLista = $('toc_list');
const metaDescripcion = document.querySelector('meta[name="description"]');
const descripcionSitio = metaDescripcion.content;

const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });
// ?preview=1 permite ver borradores (lo usa el enlace "Vista previa" del panel)
const modoPreview = new URLSearchParams(window.location.search).has('preview');
// Carpeta del sitio: base para resolver enlaces e imagenes relativas del Markdown
const URL_BASE = new URL('.', window.location.href);

let documentos = [];
let categorias = [];
let slugMostrado = null;
let peticionActual = 0;
let observadorToc = null;

// ---------- Navegacion ----------

function navegarA(slug, { reemplazar = false, hash = '' } = {}) {
    const url = new URL(window.location);
    url.searchParams.set('doc', slug);
    url.hash = hash;
    window.history[reemplazar ? 'replaceState' : 'pushState']({}, '', url);
    mostrarDocumentoPorSlug(slug);
}

function irASeccion(hash, { suave = true } = {}) {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const destino = id && content.shadowRoot?.getElementById(id);
    if (destino) destino.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    return Boolean(destino);
}

// ---------- Menu y busqueda ----------

function pintarLista() {
    const termino = busqueda.value.trim();
    const visibles = filtrarDocumentos(documentos, termino);
    lista.dataset.filtrando = termino ? '1' : '';
    lista.innerHTML = visibles.length
        ? renderizarArbol(visibles, categorias, { todoAbierto: Boolean(termino) })
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
    abrirSidebar();
    busqueda.focus();
}

function abrirSidebar() {
    sidebar.classList.add('open');
    document.body.classList.add('menu_abierto');
}

function cerrarSidebar() {
    sidebar.classList.remove('open');
    document.body.classList.remove('menu_abierto');
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

/** Renderiza Markdown con zero-md en modo manual, resolviendo rutas relativas contra la carpeta del sitio. */
async function renderizarMarkdown(markdown) {
    await customElements.whenDefined('zero-md');
    let fuente = content.querySelector('script[type="text/markdown"]');
    if (!fuente) {
        fuente = document.createElement('script');
        fuente.type = 'text/markdown';
        content.append(fuente);
    }
    fuente.text = markdown;
    await content.render({ baseUrl: URL_BASE.href });
}

function pintarRuta(categoryId, esBorrador) {
    const secciones = rutaDeCategoria(categorias, categoryId);
    const borrador = esBorrador ? '<span class="badge_draft">Borrador</span>' : '';
    ruta.innerHTML =
        secciones.map((c) => `<span>${escapeHtml(c.name)}</span>`).join('<span aria-hidden="true">›</span>') + borrador;
    ruta.hidden = !ruta.innerHTML;
}

function pintarEtiquetas(tags = []) {
    etiquetas.hidden = !tags.length;
    etiquetas.innerHTML = tags
        .map((t) => `<li><button type="button" data-tag="${escapeHtml(t.slug)}">#${escapeHtml(t.name)}</button></li>`)
        .join('');
}

function enlacePager(doc, clase, etiqueta) {
    if (!doc) return '<span></span>';
    const seccion = rutaDeCategoria(categorias, doc.category_id).at(-1)?.name;
    return `<a class="pager_link ${clase}" href="?doc=${encodeURIComponent(doc.slug)}" data-slug="${escapeHtml(doc.slug)}">
        <span class="pager_label">${etiqueta}</span>
        <span class="pager_title">${escapeHtml(doc.title)}</span>
        ${seccion ? `<span class="pager_section">${escapeHtml(seccion)}</span>` : ''}
    </a>`;
}

function pintarPager(slug) {
    const orden = ordenDeLectura(documentos, categorias);
    const i = orden.findIndex((d) => d.slug === slug);
    const anterior = i > 0 ? orden[i - 1] : null;
    const siguiente = i >= 0 && i < orden.length - 1 ? orden[i + 1] : null;
    pager.hidden = !anterior && !siguiente;
    pager.innerHTML = enlacePager(anterior, 'pager_prev', '← Anterior') + enlacePager(siguiente, 'pager_next', 'Siguiente →');
}

function pintarEncabezado(data) {
    const esBorrador = data.status === 'draft';
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
    document.title = `${data.title} — ${SITE_NAME}`;
}

async function mostrarDocumentoPorSlug(slug) {
    // Evita que una respuesta lenta sobrescriba un documento abierto despues
    const peticion = ++peticionActual;

    document.body.classList.add('cargando');
    loading.hidden = false;
    content.classList.remove('listo');
    marcarActivo(lista, slug, { desplazar: true });

    const { data, error } = await consultarDocumento(slug);
    if (peticion !== peticionActual) return;

    const noEncontrado = error || (data.status === 'draft' && !modoPreview);
    if (noEncontrado) {
        pintarEncabezado({ title: 'Documento no encontrado' });
        metaDescripcion.content = descripcionSitio;
        document.title = `No encontrado — ${SITE_NAME}`;
        pager.hidden = true;
    } else {
        pintarEncabezado(data);
        pintarPager(slug);
    }

    await renderizarMarkdown(noEncontrado ? 'El documento solicitado no existe o aún no está publicado.' : data.content);
    if (peticion !== peticionActual) return;

    slugMostrado = noEncontrado ? null : slug;
    despuesDeRenderizar(data?.title);

    loading.hidden = true;
    document.body.classList.remove('cargando');
    content.hidden = false;
    content.classList.add('listo');

    if (!irASeccion(window.location.hash, { suave: false })) window.scrollTo({ top: 0 });
    actualizarProgreso();
}

// ---------- Post-render: dentro del Shadow DOM de zero-md ----------

function despuesDeRenderizar(tituloDocumento) {
    const raiz = content.shadowRoot;
    if (!raiz) return;

    // Oculta el primer H1 si repite el titulo del documento
    const primero = raiz.querySelector('.markdown-body > :first-child');
    if (primero?.tagName === 'H1' && normalizar(primero.textContent.trim()) === normalizar(tituloDocumento ?? '')) {
        primero.classList.add('titulo_duplicado');
    }

    // Los enlaces externos abren en otra pestana
    raiz.querySelectorAll('.markdown-body a[href]').forEach((a) => {
        if (a.origin !== window.location.origin) {
            a.target = '_blank';
            a.rel = 'noopener';
        }
    });

    construirIndice(raiz);
    agregarBotonesCopiar(raiz);
}

function construirIndice(raiz) {
    observadorToc?.disconnect();

    const encabezados = [...raiz.querySelectorAll('.markdown-body h2, .markdown-body h3')];
    toc.hidden = encabezados.length < 2;
    tocLista.innerHTML = '';
    if (toc.hidden) return;

    const usados = new Set();
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
            window.history.replaceState({}, '', `#${id}`);
            irASeccion(id);
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
    raiz.querySelectorAll('.markdown-body pre').forEach((pre) => {
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

/**
 * Si el enlace apunta a otro documento del sitio, devuelve { slug, hash }.
 * Acepta ?doc=slug y rutas a archivos .md (por ejemplo "git.md" o "documents/GIT.md").
 */
function destinoInterno(a) {
    if (!a?.href || a.origin !== window.location.origin || !a.pathname.startsWith(URL_BASE.pathname)) return null;
    const url = new URL(a.href);
    const slugParametro = url.searchParams.get('doc');
    if (slugParametro) return { slug: slugParametro, hash: url.hash };

    if (/\.md$/i.test(url.pathname)) {
        const archivo = decodeURIComponent(url.pathname.split('/').pop().replace(/\.md$/i, ''));
        const slug = generarSlug(archivo);
        if (documentos.some((d) => d.slug === slug)) return { slug, hash: url.hash };
    }
    return null;
}

function configurarEnlacesInternos() {
    content.shadowRoot.addEventListener('click', (evento) => {
        if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;
        const destino = destinoInterno(evento.target.closest('a'));
        if (!destino) return;
        evento.preventDefault();
        if (destino.slug === slugMostrado) {
            window.history.pushState({}, '', destino.hash || window.location.search);
            irASeccion(destino.hash);
        } else {
            navegarA(destino.slug, { hash: destino.hash });
        }
    });
}

// ---------- Barra de progreso de lectura ----------

function actualizarProgreso() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progreso.style.transform = `scaleX(${total > 0 ? Math.min(window.scrollY / total, 1) : 0})`;
}

// ---------- Inicio ----------

function mostrarInicial() {
    const slug = obtenerSlugDeURL();
    if (slug && slug === slugMostrado) {
        irASeccion(window.location.hash); // solo cambio el #ancla
        return;
    }
    if (slug) {
        mostrarDocumentoPorSlug(slug);
        return;
    }
    const primero = primerDocumentoVisible();
    if (primero) navegarA(primero, { reemplazar: true });
    else loading.textContent = 'Aún no hay documentos.';
}

function esCampoDeTexto(elemento) {
    return elemento instanceof Element && elemento.matches('input, textarea, select, [contenteditable]');
}

function configurarEventos() {
    $('menu_button').addEventListener('click', abrirSidebar);
    $('sidebar_toggle').addEventListener('click', cerrarSidebar);
    $('backdrop').addEventListener('click', cerrarSidebar);

    recordarSeccionesPlegadas(lista);

    lista.addEventListener('click', (evento) => {
        const enlace = evento.target.closest('a[data-slug]');
        if (!enlace || evento.metaKey || evento.ctrlKey) return;
        evento.preventDefault();
        if (enlace.dataset.slug !== slugMostrado) navegarA(enlace.dataset.slug);
        cerrarSidebar();
    });

    pager.addEventListener('click', (evento) => {
        const enlace = evento.target.closest('a[data-slug]');
        if (!enlace || evento.metaKey || evento.ctrlKey) return;
        evento.preventDefault();
        navegarA(enlace.dataset.slug);
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
                busqueda.blur();
            }
        } else if (evento.key === 'Escape') {
            busqueda.value = '';
            pintarLista();
            busqueda.blur();
        }
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.altKey || evento.ctrlKey || evento.metaKey || esCampoDeTexto(evento.target)) return;
        if (evento.key === '/') {
            // "/" enfoca la busqueda, como en GitHub
            evento.preventDefault();
            abrirSidebar();
            busqueda.focus();
        } else if (evento.key === 'Escape') {
            cerrarSidebar();
        } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
            // ← → navegan al documento anterior / siguiente
            const enlace = pager.querySelector(evento.key === 'ArrowLeft' ? '.pager_prev' : '.pager_next');
            if (enlace) navegarA(enlace.dataset.slug);
        }
    });

    window.addEventListener('scroll', actualizarProgreso, { passive: true });
    window.addEventListener('resize', actualizarProgreso);
    window.addEventListener('popstate', mostrarInicial);
}

window.addEventListener('DOMContentLoaded', async () => {
    configurarEventos();
    await customElements.whenDefined('zero-md');
    configurarEnlacesInternos();
    await cargarContenido();
    mostrarInicial();
});
