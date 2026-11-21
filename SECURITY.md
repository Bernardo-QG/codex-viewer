# Política de seguridad

## Llaves de Supabase

| Llave                                    | ¿Puede ir en el repo? | Uso                                                                               |
| ---------------------------------------- | --------------------- | --------------------------------------------------------------------------------- |
| Publicable (`sb_publishable_…`)          | Sí                    | El navegador la necesita. Está diseñada para ser pública.                         |
| Secreta (`sb_secret_…` / `service_role`) | **Nunca**             | Solo en herramientas locales (por ejemplo, entornos de Bruno, ignorados por Git). |

La protección de los datos no depende de ocultar la llave publicable, sino de las políticas **Row Level Security** de Supabase. Ver [ADR 0007](docs/adr/0007-seguridad-con-llave-publicable-y-rls.md).

## Estado actual

> ⚠️ **Pendiente:** el panel de administración todavía no tiene inicio de sesión, y las tablas aceptan escrituras con la llave publicable. Mientras no se apliquen el login y las políticas RLS del ADR 0007, cualquier persona con la llave puede modificar documentos y leer los borradores a través de la API.

## Si se filtra una llave secreta

1. Revócala de inmediato en Supabase, en Project Settings → API Keys, y genera otra.
2. Elimínala del código y, si llegó a un commit, considera el historial comprometido aunque la borres después.
3. Revisa en los logs de Supabase si hubo cambios no esperados.

## Reportar una vulnerabilidad

No abras un issue público. Escríbele al autor por un [aviso de seguridad privado](https://github.com/Bernardo-QG/codex-viewer/security/advisories/new) en GitHub.
