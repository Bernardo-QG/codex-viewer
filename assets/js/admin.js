import {
    sb,
    escapeHtml,
    generarSlug,
    obtenerSlugDeURL,
    obtenerContenido,
    aplanarCategorias,
    renderizarArbol,
    marcarActivo
} from './utils.js';

// Documento en edicion: id para guardar y slug para la URL
let idEditando = null;
let slugEditando = null;
let completo = false;
let temporizadorEstado = null;

const $ = (id) => document.getElementById(id);
const inputTitle = $('input_title');
const inputSlug = $('input_slug');
const inputStatus = $('input_status');
const inputSummary = $('input_summary');
const inputCategory = $('input_category');
const inputOrder = $('input_order');
const inputTags = $('input_tags');
const listaEtiquetas = $('lista_etiquetas');
const contadorResumen = $('contador_resumen');
const btnGuardar = $('btn_guardar');
const btnEliminar = $('btn_eliminar');
const btnNuevo = $('btn_nuevo');
const linkVer = $('link_ver');
const formDocumento = $('form_documento');
const formStatus = $('form_status');
const documentList = $('document_list');

const editor = new EasyMDE({
    element: $('input_content'),
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

function actualizarContador() {
    contadorResumen.textContent = `${inputSummary.value.length}/300`;
}

function modoEdicion(id, slug, status) {
    idEditando = id;
    slugEditando = slug;
    btnEliminar.hidden = !id;
    linkVer.hidden = !id;
    btnGuardar.textContent = id ? 'Actualizar' : 'Guardar';
    if (id) {
        const preview = status === 'draft' ? '&preview=1' : '';
        linkVer.href = `./?doc=${encodeURIComponent(slug)}${preview}`;
        linkVer.textContent = status === 'draft' ? 'Vista previa ↗' : 'Ver publicado ↗';
    }
}

function limpiarFormulario({ actualizarURL = true } = {}) {
    formDocumento.reset();
    inputOrder.value = '0';
    editor.value('');
    actualizarContador();
    modoEdicion(null, null);

    if (actualizarURL) {
        const url = new URL(window.location);
        url.searchParams.delete('doc');
        window.history.pushState({}, '', url);
    }

    marcarActivo(documentList, null);
    inputTitle.focus();
}

// ---------- Carga ----------

async function cargarListas() {
    const resultado = await obtenerContenido({ incluirBorradores: true });

    if (resultado.error) {
        documentList.innerHTML = '<li class="list_error">No se pudo cargar la lista.</li>';
        return;
    }

    completo = resultado.completo;
    document.querySelectorAll('.extendido').forEach((el) => (el.hidden = !completo));
    $('aviso_migracion').hidden = completo;

    documentList.innerHTML = renderizarArbol(resultado.documentos, resultado.categorias, 'admin.html');
    marcarActivo(documentList, slugEditando);

    if (!completo) return;

    // Secciones con sangria segun su nivel
    const seleccion = inputCategory.value;
    inputCategory.innerHTML =
        '<option value="">Sin sección</option>' +
        aplanarCategorias(resultado.categorias)
            .map((c) => `<option value="${c.id}">${'   '.repeat(c.nivel)}${escapeHtml(c.name)}</option>`)
            .join('');
    inputCategory.value = seleccion;

    const { data: tags } = await sb.from('tags').select('name').order('name');
    listaEtiquetas.innerHTML = (tags ?? []).map((t) => `<option value="${escapeHtml(t.name)}"></option>`).join('');
}

async function cargarDocumento(slug) {
    const campos = completo
        ? 'id, title, slug, summary, content, status, category_id, sort_order, tags(name)'
        : 'id, title, slug, content';
    const { data, error } = await sb.from('documents').select(campos).eq('slug', slug).single();

    if (error) {
        mostrarEstado('Documento no encontrado', 'error');
        return;
    }

    inputTitle.value = data.title;
    inputSlug.value = data.slug;
    inputStatus.value = data.status ?? 'published';
    inputSummary.value = data.summary ?? '';
    inputCategory.value = data.category_id ?? '';
    inputOrder.value = data.sort_order ?? 0;
    inputTags.value = (data.tags ?? []).map((t) => t.name).join(', ');
    editor.value(data.content);
    actualizarContador();
    modoEdicion(data.id, data.slug, data.status);
    marcarActivo(documentList, slug);
}

// ---------- Guardado ----------

/** Crea las etiquetas que no existan y reemplaza las del documento. */
async function guardarEtiquetas(documentId) {
    const porSlug = new Map();
    for (const nombre of inputTags.value.split(',')) {
        const limpio = nombre.trim().replace(/^#/, '');
        const slug = generarSlug(limpio);
        if (slug && !porSlug.has(slug)) porSlug.set(slug, limpio);
    }

    let tags = [];
    if (porSlug.size) {
        const { data, error } = await sb
            .from('tags')
            .upsert([...porSlug].map(([slug, name]) => ({ slug, name })), { onConflict: 'slug' })
            .select('id');
        if (error) return error;
        tags = data;
    }

    const borrado = await sb.from('document_tags').delete().eq('document_id', documentId);
    if (borrado.error) return borrado.error;

    if (tags.length) {
        const { error } = await sb
            .from('document_tags')
            .insert(tags.map((t) => ({ document_id: documentId, tag_id: t.id })));
        if (error) return error;
    }
    return null;
}

async function guardarDocumento(evento) {
    evento.preventDefault();

    const title = inputTitle.value.trim();
    const slug = inputSlug.value.trim();
    const content = editor.value().trim();

    if (!title || !slug || !content) {
        mostrarEstado('Título, slug y contenido son requeridos', 'error');
        return;
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        mostrarEstado('El slug solo admite minúsculas, números y guiones', 'error');
        return;
    }

    const registro = { title, slug, content };
    if (completo) {
        registro.summary = inputSummary.value.trim() || null;
        registro.status = inputStatus.value;
        registro.category_id = inputCategory.value ? Number(inputCategory.value) : null;
        registro.sort_order = Number(inputOrder.value) || 0;
    }

    btnGuardar.disabled = true;
    const esNuevo = !idEditando;
    const { data, error } = esNuevo
        ? await sb.from('documents').insert(registro).select('id').single()
        : await sb.from('documents').update(registro).eq('id', idEditando).select('id').single();

    if (error) {
        btnGuardar.disabled = false;
        mostrarEstado(error.code === '23505' ? 'Ya existe un documento con ese slug' : `Error: ${error.message}`, 'error');
        return;
    }

    const errorEtiquetas = completo ? await guardarEtiquetas(data.id) : null;
    btnGuardar.disabled = false;

    modoEdicion(data.id, slug, registro.status);
    const url = new URL(window.location);
    url.searchParams.set('doc', slug);
    window.history.replaceState({}, '', url);

    if (errorEtiquetas) {
        mostrarEstado(`Guardado, pero falló al guardar etiquetas: ${errorEtiquetas.message}`, 'error');
    } else {
        mostrarEstado(esNuevo ? 'Documento creado' : 'Documento actualizado', 'success');
    }

    await cargarListas();
}

async function eliminarDocumento() {
    if (!idEditando) return;

    const confirmado = confirm(`¿Eliminar "${inputTitle.value}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    const { error } = await sb.from('documents').delete().eq('id', idEditando);

    if (error) {
        mostrarEstado(`Error: ${error.message}`, 'error');
        return;
    }

    limpiarFormulario();
    mostrarEstado('Documento eliminado', 'success');
    await cargarListas();
}

// ---------- Eventos ----------

inputTitle.addEventListener('input', () => {
    if (!idEditando) inputSlug.value = generarSlug(inputTitle.value);
});

inputSummary.addEventListener('input', actualizarContador);

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
    await cargarListas();

    const slug = obtenerSlugDeURL();
    if (slug) cargarDocumento(slug);
});
