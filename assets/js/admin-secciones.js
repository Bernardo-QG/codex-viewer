import { sb, escapeHtml, generarSlug, aplanarCategorias } from './utils.js';
import { crearEstado, describirError, enlazarSlug, plural } from './admin-comun.js';

const $ = (id) => document.getElementById(id);

/**
 * Vista "Secciones" del panel: arbol de secciones con alta, edicion y baja.
 * @param {{ alCambiar: () => void }} opciones alCambiar se llama tras guardar o eliminar
 */
export function iniciarSecciones({ alCambiar }) {
    const lista = $('lista_secciones');
    const form = $('form_seccion');
    const titulo = $('titulo_seccion');
    const nombre = $('seccion_nombre');
    const slug = $('seccion_slug');
    const padre = $('seccion_padre');
    const orden = $('seccion_orden');
    const descripcion = $('seccion_descripcion');
    const info = $('info_seccion');
    const btnGuardar = $('btn_guardar_seccion');
    const btnEliminar = $('btn_eliminar_seccion');
    const mostrarEstado = crearEstado($('estado_seccion'));
    const slugAuto = enlazarSlug(nombre, slug, generarSlug);

    let categorias = [];
    let docsPorSeccion = new Map();
    let idEditando = null;

    const hijosDe = (id) => categorias.filter((c) => c.parent_id === id);

    /** Ids de todas las subsecciones de una seccion, a cualquier profundidad. */
    function descendientes(id) {
        const ids = new Set();
        const recorrer = (actual) =>
            hijosDe(actual).forEach((h) => {
                ids.add(h.id);
                recorrer(h.id);
            });
        recorrer(id);
        return ids;
    }

    /** Trae las secciones y cuenta los documentos de cada una. */
    async function cargar() {
        const [cats, docs] = await Promise.all([
            sb.from('categories').select('id, parent_id, name, slug, description, sort_order'),
            sb.from('documents').select('category_id')
        ]);

        if (cats.error || docs.error) {
            lista.innerHTML = '<li class="list_error">No se pudieron cargar las secciones.</li>';
            return;
        }

        categorias = cats.data;
        docsPorSeccion = new Map();
        for (const d of docs.data) {
            if (d.category_id != null) docsPorSeccion.set(d.category_id, (docsPorSeccion.get(d.category_id) ?? 0) + 1);
        }

        pintarLista();
        pintarPadres();
        if (idEditando && !categorias.some((c) => c.id === idEditando)) nueva();
    }

    /** Dibuja el arbol de secciones con su numero de documentos. */
    function pintarLista() {
        const plano = aplanarCategorias(categorias);
        lista.innerHTML = plano.length
            ? plano
                  .map(
                      (c) => `<li${c.id === idEditando ? ' class="active"' : ''}>
                <a href="#" data-id="${c.id}" style="padding-left: calc(0.75rem + ${c.nivel}rem)">
                    <span>${escapeHtml(c.name)}</span>
                    <span class="admin_count" title="Documentos">${docsPorSeccion.get(c.id) ?? 0}</span>
                </a>
            </li>`
                  )
                  .join('')
            : '<li class="list_empty">Aún no hay secciones. Crea la primera con el formulario.</li>';
    }

    /** Llena el select de seccion padre sin la seccion en edicion ni sus descendientes, para evitar ciclos. */
    function pintarPadres() {
        const excluidos = idEditando ? new Set([idEditando, ...descendientes(idEditando)]) : new Set();
        const seleccion = padre.value;
        padre.innerHTML =
            '<option value="">Primer nivel</option>' +
            aplanarCategorias(categorias)
                .filter((c) => !excluidos.has(c.id))
                .map((c) => `<option value="${c.id}">${'   '.repeat(c.nivel)}${escapeHtml(c.name)}</option>`)
                .join('');
        padre.value = seleccion;
    }

    /** Deja el formulario listo para crear una seccion. */
    function nueva() {
        idEditando = null;
        form.reset();
        orden.value = '0';
        slugAuto.reiniciar(false);
        titulo.textContent = 'Nueva sección';
        btnGuardar.textContent = 'Crear sección';
        btnEliminar.hidden = true;
        info.textContent = '';
        pintarLista();
        pintarPadres();
        nombre.focus();
    }

    /** Carga en el formulario la seccion indicada. */
    function editar(id) {
        const c = categorias.find((x) => x.id === id);
        if (!c) return;
        idEditando = id;
        pintarPadres();
        nombre.value = c.name;
        slug.value = c.slug;
        padre.value = c.parent_id ?? '';
        orden.value = c.sort_order ?? 0;
        descripcion.value = c.description ?? '';
        slugAuto.reiniciar(true);

        const docs = docsPorSeccion.get(id) ?? 0;
        const subs = hijosDe(id).length;
        titulo.textContent = c.name;
        info.textContent = `Contiene ${plural(docs, 'documento', 'documentos')} y ${plural(subs, 'subsección', 'subsecciones')}.`;
        btnGuardar.textContent = 'Guardar cambios';
        btnEliminar.hidden = false;
        pintarLista();
    }

    /** Crea o actualiza la seccion del formulario. */
    async function guardar(evento) {
        evento.preventDefault();
        const registro = {
            name: nombre.value.trim(),
            slug: slug.value.trim(),
            parent_id: padre.value ? Number(padre.value) : null,
            description: descripcion.value.trim() || null,
            sort_order: Number(orden.value) || 0
        };

        if (!registro.name || !registro.slug) {
            mostrarEstado('Nombre y slug son requeridos', 'error');
            return;
        }

        btnGuardar.disabled = true;
        const { data, error } = idEditando
            ? await sb.from('categories').update(registro).eq('id', idEditando).select('id').single()
            : await sb.from('categories').insert(registro).select('id').single();
        btnGuardar.disabled = false;

        if (error) {
            mostrarEstado(
                describirError(error, {
                    duplicado: 'Ya existe una sección con ese slug, o con ese nombre en el mismo nivel'
                }),
                'error'
            );
            return;
        }

        const eraNueva = !idEditando;
        idEditando = data.id;
        await cargar();
        editar(data.id);
        mostrarEstado(eraNueva ? 'Sección creada' : 'Cambios guardados');
        alCambiar();
    }

    /** Elimina la seccion en edicion si no tiene subsecciones; sus documentos quedan sin seccion. */
    async function eliminar() {
        const c = categorias.find((x) => x.id === idEditando);
        if (!c) return;

        const subs = hijosDe(c.id).length;
        if (subs) {
            mostrarEstado(`Primero mueve o elimina sus ${plural(subs, 'subsección', 'subsecciones')}`, 'error');
            return;
        }

        const docs = docsPorSeccion.get(c.id) ?? 0;
        const aviso = docs ? ` Sus ${plural(docs, 'documento quedará', 'documentos quedarán')} sin sección.` : '';
        if (!confirm(`¿Eliminar la sección "${c.name}"?${aviso}`)) return;

        const { error } = await sb.from('categories').delete().eq('id', c.id);
        if (error) {
            mostrarEstado(describirError(error), 'error');
            return;
        }

        await cargar();
        nueva();
        mostrarEstado('Sección eliminada');
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
    $('btn_nueva_seccion').addEventListener('click', nueva);

    return { cargar };
}
