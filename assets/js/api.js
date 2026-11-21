import { SITE_NAME, sb, obtenerSlugDeURL, obtenerDocumentos, renderizarLista, marcarActivo } from './utils.js';

const lista = document.getElementById('document_list');
const loading = document.getElementById('loading');
const content = document.getElementById('content');
const titulo = document.getElementById('document_title');
const etiquetaSlug = document.getElementById('document_slug');

let documentos = [];
let peticionActual = 0;

function encodeMarkdown(str) {
    return 'data:text/markdown;base64,' + btoa(unescape(encodeURIComponent(str)));
}

function navegarA(slug, { reemplazar = false } = {}) {
    const url = new URL(window.location);
    url.searchParams.set('doc', slug);
    window.history[reemplazar ? 'replaceState' : 'pushState']({}, '', url);
    mostrarDocumentoPorSlug(slug);
}

async function listarDocumentos() {
    const { data, error } = await obtenerDocumentos();

    if (error) {
        lista.innerHTML = '<li class="list_error">No se pudo cargar la lista.</li>';
        return;
    }

    documentos = data;
    lista.innerHTML = renderizarLista(documentos);
}

async function mostrarDocumentoPorSlug(slug) {
    // Evita que una respuesta lenta sobrescriba un documento abierto despues
    const peticion = ++peticionActual;

    loading.hidden = false;
    content.hidden = true;
    marcarActivo(lista, slug);

    const { data, error } = await sb.from('documents').select('title, slug, content').eq('slug', slug).single();

    if (peticion !== peticionActual) return;

    loading.hidden = true;
    content.hidden = false;

    if (error) {
        titulo.textContent = 'Documento no encontrado';
        etiquetaSlug.textContent = '';
        content.src = encodeMarkdown('# 404\nEl documento solicitado no existe.');
        document.title = `No encontrado — ${SITE_NAME}`;
        return;
    }

    titulo.textContent = data.title;
    etiquetaSlug.textContent = data.slug;
    content.src = encodeMarkdown(data.content);
    document.title = `${data.title} — ${SITE_NAME}`;
    window.scrollTo({ top: 0 });
}

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

    window.addEventListener('popstate', mostrarInicial);
}

window.addEventListener('DOMContentLoaded', async () => {
    configurarEventos();
    await listarDocumentos();
    mostrarInicial();
});
