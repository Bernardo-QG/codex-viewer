import { SITE_NAME, sb, obtenerSlugDeURL, obtenerDocumentos, renderizarLista, marcarActivo } from './utils.js';

const lista = document.getElementById('document_list');
const busqueda = document.getElementById('search');
const loading = document.getElementById('loading');
const content = document.getElementById('content');
const titulo = document.getElementById('document_title');
const etiquetaSlug = document.getElementById('document_slug');
const etiquetaActualizado = document.getElementById('document_updated');
const toc = document.getElementById('toc');
const tocLista = document.getElementById('toc_list');

const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });

let documentos = [];
let peticionActual = 0;
let observadorToc = null;

function encodeMarkdown(str) {
    return 'data:text/markdown;base64,' + btoa(unescape(encodeURIComponent(str)));
}

function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

function navegarA(slug, { reemplazar = false } = {}) {
    const url = new URL(window.location);
    url.searchParams.set('doc', slug);
    window.history[reemplazar ? 'replaceState' : 'pushState']({}, '', url);
    mostrarDocumentoPorSlug(slug);
}

// ---------- Lista y busqueda ----------

function documentosFiltrados() {
    const termino = normalizar(busqueda.value.trim());
    if (!termino) return documentos;
    return documentos.filter(
        (doc) => normalizar(doc.title).includes(termino) || normalizar(doc.category?.name ?? '').includes(termino)
    );
}

function pintarLista() {
    const visibles = documentosFiltrados();
    lista.innerHTML = visibles.length
        ? renderizarLista(visibles)
        : '<li class="list_empty">Sin resultados</li>';
    marcarActivo(lista, obtenerSlugDeURL());
}

async function listarDocumentos() {
    const { data, error } = await obtenerDocumentos();

    if (error) {
        lista.innerHTML = '<li class="list_error">No se pudo cargar la lista.</li>';
        return;
    }

    documentos = data;
    pintarLista();
}

// ---------- Documento ----------

async function consultarDocumento(slug) {
    const completo = await sb.from('documents').select('title, slug, content, updated_at').eq('slug', slug).single();
    // Si la columna updated_at aun no existe, se consulta sin ella
    if (completo.error && completo.error.code !== 'PGRST116') {
        return sb.from('documents').select('title, slug, content').eq('slug', slug).single();
    }
    return completo;
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

    if (error) {
        titulo.textContent = 'Documento no encontrado';
        etiquetaSlug.textContent = '';
        etiquetaActualizado.hidden = true;
        content.src = encodeMarkdown('# 404\nEl documento solicitado no existe.');
        document.title = `No encontrado — ${SITE_NAME}`;
        return;
    }

    titulo.textContent = data.title;
    etiquetaSlug.textContent = data.slug;
    etiquetaActualizado.hidden = !data.updated_at;
    if (data.updated_at) {
        etiquetaActualizado.textContent = `Actualizado el ${formatoFecha.format(new Date(data.updated_at))}`;
    }
    content.src = encodeMarkdown(data.content);
    document.title = `${data.title} — ${SITE_NAME}`;
    window.scrollTo({ top: 0 });
}

// ---------- Indice y botones de copiar (dentro del Shadow DOM de zero-md) ----------

function slugificar(texto) {
    return normalizar(texto)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

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
        let id = h.id || slugificar(h.textContent) || 'seccion';
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
    const slug = obtenerSlugDeURL();
    if (slug) {
        mostrarDocumentoPorSlug(slug);
    } else if (documentos.length) {
        navegarA(documentos[0].slug, { reemplazar: true });
    } else {
        loading.textContent = 'Aún no hay documentos.';
    }
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

    busqueda.addEventListener('input', pintarLista);
    busqueda.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            const primero = documentosFiltrados()[0];
            if (primero) {
                navegarA(primero.slug);
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
        document.getElementById('sidebar').classList.add('open');
        busqueda.focus();
    });

    window.addEventListener('popstate', mostrarInicial);
}

window.addEventListener('DOMContentLoaded', async () => {
    configurarEventos();
    await listarDocumentos();
    mostrarInicial();
});
