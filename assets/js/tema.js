// Tema claro / oscuro. Se carga en <head> sin "defer" para aplicar el tema antes de pintar
// y evitar el parpadeo. Respeta la preferencia del sistema hasta que la persona elige uno.
(function () {
    var CLAVE = 'codex.tema';
    var consulta = window.matchMedia('(prefers-color-scheme: light)');

    function guardado() {
        try {
            return localStorage.getItem(CLAVE);
        } catch (e) {
            return null;
        }
    }

    function aplicar(tema) {
        document.documentElement.dataset.theme = tema;
        var boton = document.getElementById('theme_toggle');
        if (boton) boton.setAttribute('aria-label', tema === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
    }

    aplicar(guardado() || (consulta.matches ? 'light' : 'dark'));

    consulta.addEventListener('change', function (e) {
        if (!guardado()) aplicar(e.matches ? 'light' : 'dark');
    });

    document.addEventListener('DOMContentLoaded', function () {
        var boton = document.getElementById('theme_toggle');
        if (!boton) return;
        aplicar(document.documentElement.dataset.theme);
        boton.addEventListener('click', function () {
            var tema = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
            aplicar(tema);
            try {
                localStorage.setItem(CLAVE, tema);
            } catch (e) {
                /* sin almacenamiento: solo dura la visita */
            }
        });
    });
})();
