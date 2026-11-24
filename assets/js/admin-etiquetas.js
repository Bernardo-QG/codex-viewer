import { sb, escapeHtml, generarSlug } from './utils.js';
import { crearEstado, describirError, enlazarSlug, plural } from './admin-comun.js';

const $ = (id) => document.getElementById(id);

/**
 * Vista "Etiquetas" del panel: renombrar, crear, eliminar y limpiar las que no se usan.
 * @param {{ alCambiar: () => void }} opciones alCambiar se llama tras guardar o eliminar
 */
export function iniciarEtiquetas({ alCambiar }) {
    const lista = $('lista_etiquetas_admin');
    const form = $('form_etiqueta');
    const titulo = $('titulo_etiqueta');
    const nombre = $('etiqueta_nombre');
    const slug = $('etiqueta_slug');
    const info = $('info_etiqueta');
    const btnGuardar = $('btn_guardar_etiqueta');
    const btnEliminar = $('btn_eliminar_etiqueta');
    const btnLimpiar = $('btn_limpiar_etiquetas');
    const mostrarEstado = crearEstado($('estado_etiqueta'));
    const slugAuto = enlazarSlug(nombre, slug, generarSlug);

    let etiquetas = [];
    let usos = new Map();
    let idEditando = null;

    const sinUso = () => etiquetas.filter((t) => !usos.get(t.id));

    /** Trae las etiquetas y cuenta en cuantos documentos se usa cada una. */
    async function cargar() {
        const [tags, relaciones] = await Promise.all([
            sb.from('tags').select('id, name, slug').order('name'),
            sb.from('document_tags').select('tag_id')
        ]);

        if (tags.error || relaciones.error) {
            lista.innerHTML = '<li class="list_error">No se pudieron cargar las etiquetas.</li>';
            return;
        }

        etiquetas = tags.data;
        usos = new Map();
        for (const r of relaciones.data) usos.set(r.tag_id, (usos.get(r.tag_id) ?? 0) + 1);

        pintarLista();
        if (idEditando && !etiquetas.some((t) => t.id === idEditando)) nueva();
    }

    /** Dibuja la lista de etiquetas con su numero de documentos. */
    function pintarLista() {
        lista.innerHTML = etiquetas.length
            ? etiquetas
                  .map(
                      (t) => `<li${t.id === idEditando ? ' class="active"' : ''}>
                <a href="#" data-id="${t.id}">
                    <span>#${escapeHtml(t.name)}</span>
                    <span class="admin_count" title="Documentos">${usos.get(t.id) ?? 0}</span>
                </a>
            </li>`
                  )
                  .join('')
            : '<li class="list_empty">Aún no hay etiquetas. También se crean al escribirlas en un documento.</li>';

        const libres = sinUso().length;
        btnLimpiar.hidden = !libres;
        btnLimpiar.textContent = `Quitar ${plural(libres, 'etiqueta sin uso', 'etiquetas sin uso')}`;
    }

    /** Deja el formulario listo para crear una etiqueta. */
    function nueva() {
        idEditando = null;
        form.reset();
        slugAuto.reiniciar(false);
        titulo.textContent = 'Nueva etiqueta';
        btnGuardar.textContent = 'Crear etiqueta';
        btnEliminar.hidden = true;
        info.textContent = '';
        pintarLista();
        nombre.focus();
    }

    /** Carga en el formulario la etiqueta indicada. */
    function editar(id) {
        const t = etiquetas.find((x) => x.id === id);
        if (!t) return;
        idEditando = id;
        nombre.value = t.name;
        slug.value = t.slug;
        slugAuto.reiniciar(true);
        titulo.textContent = `#${t.name}`;
        info.textContent = `Se usa en ${plural(usos.get(id) ?? 0, 'documento', 'documentos')}.`;
        btnGuardar.textContent = 'Guardar cambios';
        btnEliminar.hidden = false;
        pintarLista();
    }

    /** Crea o actualiza la etiqueta del formulario. */
    async function guardar(evento) {
        evento.preventDefault();
        const registro = { name: nombre.value.trim().replace(/^#/, ''), slug: slug.value.trim() };

        if (!registro.name || !registro.slug) {
            mostrarEstado('Nombre y slug son requeridos', 'error');
            return;
        }

        btnGuardar.disabled = true;
        const { data, error } = idEditando
            ? await sb.from('tags').update(registro).eq('id', idEditando).select('id').single()
            : await sb.from('tags').insert(registro).select('id').single();
        btnGuardar.disabled = false;

        if (error) {
            mostrarEstado(describirError(error, { duplicado: 'Ya existe una etiqueta con ese slug' }), 'error');
            return;
        }

        const eraNueva = !idEditando;
        idEditando = data.id;
        await cargar();
        editar(data.id);
        mostrarEstado(eraNueva ? 'Etiqueta creada' : 'Cambios guardados');
        alCambiar();
    }

    /** Elimina la etiqueta en edicion despues de confirmar. */
    async function eliminar() {
        const t = etiquetas.find((x) => x.id === idEditando);
        if (!t) return;

        const n = usos.get(t.id) ?? 0;
        const aviso = n ? ` Se quitará de ${plural(n, 'documento', 'documentos')}.` : '';
        if (!confirm(`¿Eliminar la etiqueta #${t.name}?${aviso}`)) return;

        const { error } = await sb.from('tags').delete().eq('id', t.id);
        if (error) {
            mostrarEstado(describirError(error), 'error');
            return;
        }

        await cargar();
        nueva();
        mostrarEstado('Etiqueta eliminada');
        alCambiar();
    }

    /** Elimina de una vez todas las etiquetas que ningun documento usa. */
    async function limpiarSinUso() {
        const libres = sinUso();
        if (!libres.length) return;
        const nombres = libres.map((t) => `#${t.name}`).join(', ');
        if (!confirm(`¿Eliminar ${plural(libres.length, 'etiqueta', 'etiquetas')} sin uso?\n${nombres}`)) return;

        const { error } = await sb
            .from('tags')
            .delete()
            .in(
                'id',
                libres.map((t) => t.id)
            );
        if (error) {
            mostrarEstado(describirError(error), 'error');
            return;
        }

        await cargar();
        if (!etiquetas.some((t) => t.id === idEditando)) nueva();
        mostrarEstado(`${plural(libres.length, 'etiqueta eliminada', 'etiquetas eliminadas')}`);
        alCambiar();
    }

    lista.addEventListener('click', (evento) => {
        const enlace = evento.target.closest('a[data-id]');
        if (!enlace) return;
        evento.preventDefault();
        editar(Number(enlace.dataset.id));
    });
    form.addEventListener('submit', guardar);
    btnEliminar.addEventListener('click', eliminar);
    btnLimpiar.addEventListener('click', limpiarSinUso);
    $('btn_nueva_etiqueta').addEventListener('click', nueva);

    return { cargar };
}
