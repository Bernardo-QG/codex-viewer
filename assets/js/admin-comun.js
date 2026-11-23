// Utilidades compartidas por las vistas del panel de administracion.

/** Devuelve una funcion que muestra un mensaje temporal en el elemento indicado. */
export function crearEstado(elemento) {
    let temporizador = null;
    return (mensaje, tipo = 'success') => {
        clearTimeout(temporizador);
        elemento.textContent = mensaje;
        elemento.className = `form_status ${tipo}`;
        temporizador = setTimeout(() => (elemento.textContent = ''), 4000);
    };
}

/** Traduce los errores de PostgreSQL/PostgREST mas comunes a un mensaje claro. */
export function describirError(error, { duplicado = 'Ya existe un registro con esos datos' } = {}) {
    if (!error) return '';
    if (error.code === '23505') return duplicado;
    if (error.code === '23514') return 'Algún campo no tiene el formato válido (revisa el slug)';
    if (error.code === '23503') return 'No se puede eliminar porque otros registros dependen de este';
    if (error.code === '42501') return 'Sin permiso para guardar (revisa las políticas RLS)';
    return `Error: ${error.message}`;
}

/**
 * Llena el slug a partir del nombre mientras la persona no lo haya editado a mano.
 * @returns {{ reiniciar(manual: boolean): void }}
 */
export function enlazarSlug(inputNombre, inputSlug, generarSlug) {
    let manual = false;
    inputNombre.addEventListener('input', () => {
        if (!manual) inputSlug.value = generarSlug(inputNombre.value);
    });
    inputSlug.addEventListener('input', () => (manual = inputSlug.value !== ''));
    return { reiniciar: (valor) => (manual = valor) };
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
