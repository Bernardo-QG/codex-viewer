import { sb, escapeHtml, obtenerSlugDeURL, obtenerDocumentos, renderizarLista, marcarActivo } from './utils.js';

let slugEditando = null;
let conCategorias = false;
let temporizadorEstado = null;

const inputTitle = document.getElementById('input_title');
const inputSlug = document.getElementById('input_slug');
const inputContent = document.getElementById('input_content');
const inputCategory = document.getElementById('input_category');
const inputOrder = document.getElementById('input_order');
const grupoCategoria = document.getElementById('group_category');
const btnGuardar = document.getElementById('btn_guardar');
const btnEliminar = document.getElementById('btn_eliminar');
const btnNuevo = document.getElementById('btn_nuevo');
const linkVer = document.getElementById('link_ver');
const formDocumento = document.getElementById('form_documento');
const formStatus = document.getElementById('form_status');
const documentList = document.getElementById('document_list');

const editor = new EasyMDE({
    element: inputContent,
    spellChecker: false,
    autosave: { enabled: false },
    placeholder: 'Escribe el contenido en Markdown...',
    minHeight: '400px',
    status: ['lines', 'words']
});

function mostrarEstado(mensaje, tipo) {
    clearTimeout(temporizadorEstado);
    formStatus.textContent = mensaje;
    formStatus.className = `form_status ${tipo}`;
    temporizadorEstado = setTimeout(() => {
        formStatus.textContent = '';
    }, 3000);
}

function generarSlug(titulo) {
    return titulo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function modoEdicion(slug) {
    slugEditando = slug;
    btnEliminar.hidden = !slug;
    linkVer.hidden = !slug;
    btnGuardar.textContent = slug ? 'Actualizar' : 'Guardar';
    if (slug) linkVer.href = `./?doc=${encodeURIComponent(slug)}`;
}

function limpiarFormulario({ actualizarURL = true } = {}) {
    inputTitle.value = '';
    inputSlug.value = '';
    inputCategory.value = '';
    inputOrder.value = '0';
    editor.value('');
    modoEdicion(null);

    if (actualizarURL) {
        const url = new URL(window.location);
        url.searchParams.delete('doc');
        window.history.pushState({}, '', url);
    }

    marcarActivo(documentList, null);
    inputTitle.focus();
}

async function cargarCategorias() {
    const { data, error } = await sb.from('categories').select('id, name').order('sort_order', { ascending: true });

    if (error) return;

    inputCategory.innerHTML =
        '<option value="">Sin categoría</option>' +
        data.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

async function listarDocumentos() {
    const resultado = await obtenerDocumentos();

    if (resultado.error) {
        documentList.innerHTML = '<li class="list_error">No se pudo cargar la lista.</li>';
        return;
    }

    conCategorias = resultado.conCategorias;
    grupoCategoria.hidden = !conCategorias;
    documentList.innerHTML = renderizarLista(resultado.data, 'admin.html');
    marcarActivo(documentList, slugEditando);
}

async function cargarDocumento(slug) {
    const campos = conCategorias ? 'title, slug, content, category_id, sort_order' : 'title, slug, content';
    const { data, error } = await sb.from('documents').select(campos).eq('slug', slug).single();

    if (error) {
        mostrarEstado('Documento no encontrado', 'error');
        return;
    }

    inputTitle.value = data.title;
    inputSlug.value = data.slug;
    inputCategory.value = data.category_id ?? '';
    inputOrder.value = data.sort_order ?? 0;
    editor.value(data.content);
    modoEdicion(data.slug);
    marcarActivo(documentList, slug);
}

async function guardarDocumento(evento) {
    evento.preventDefault();

    const title = inputTitle.value.trim();
    const slug = inputSlug.value.trim();
    const content = editor.value().trim();

    if (!title || !slug || !content) {
        mostrarEstado('Todos los campos son requeridos', 'error');
        return;
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        mostrarEstado('El slug solo admite minúsculas, números y guiones', 'error');
        return;
    }

    const registro = { title, slug, content };
    if (conCategorias) {
        registro.category_id = inputCategory.value ? Number(inputCategory.value) : null;
        registro.sort_order = Number(inputOrder.value) || 0;
    }

    btnGuardar.disabled = true;
    const { error } = slugEditando
        ? await sb.from('documents').update(registro).eq('slug', slugEditando)
        : await sb.from('documents').insert(registro);
    btnGuardar.disabled = false;

    if (error) {
        const mensaje = error.code === '23505' ? 'Ya existe un documento con ese slug' : `Error: ${error.message}`;
        mostrarEstado(mensaje, 'error');
        return;
    }

    mostrarEstado(slugEditando ? 'Documento actualizado' : 'Documento creado', 'success');
    modoEdicion(slug);

    const url = new URL(window.location);
    url.searchParams.set('doc', slug);
    window.history.replaceState({}, '', url);

    await listarDocumentos();
}

async function eliminarDocumento() {
    if (!slugEditando) return;

    const confirmado = confirm(`¿Eliminar "${inputTitle.value}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    const { error } = await sb.from('documents').delete().eq('slug', slugEditando);

    if (error) {
        mostrarEstado(`Error: ${error.message}`, 'error');
        return;
    }

    limpiarFormulario();
    mostrarEstado('Documento eliminado', 'success');
    await listarDocumentos();
}

inputTitle.addEventListener('input', () => {
    if (!slugEditando) inputSlug.value = generarSlug(inputTitle.value);
});

documentList.addEventListener('click', (evento) => {
    const enlace = evento.target.closest('a[data-slug]');
    if (!enlace) return;
    evento.preventDefault();

    const url = new URL(window.location);
    url.searchParams.set('doc', enlace.dataset.slug);
    window.history.pushState({}, '', url);

    cargarDocumento(enlace.dataset.slug);
});

formDocumento.addEventListener('submit', guardarDocumento);
btnEliminar.addEventListener('click', eliminarDocumento);
btnNuevo.addEventListener('click', () => limpiarFormulario());

window.addEventListener('popstate', () => {
    const slug = obtenerSlugDeURL();
    if (slug) cargarDocumento(slug);
    else limpiarFormulario({ actualizarURL: false });
});

window.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([listarDocumentos(), cargarCategorias()]);

    const slug = obtenerSlugDeURL();
    if (slug) cargarDocumento(slug);
});
