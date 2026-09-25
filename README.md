# PEÑA CONNECT — V1

CRM comercial PWA orientado a móvil.

## Qué incluye
- Dashboard con ventas, objetivo, cumplimiento, clientes, prospectos, visitas y margen.
- Clientes y prospectos: alta, edición, búsqueda y borrado.
- Agenda: crear visitas y marcarlas como realizadas.
- Ventas: registro y resumen anual.
- Objetivo anual.
- Exportación de clientes, visitas y ventas a CSV.
- Copia/restauración completa en JSON.
- Persistencia local en el navegador.
- PWA instalable y preparada para funcionar offline tras la primera carga.
- Modelo de datos con `userId` y `role` para facilitar futura migración multiusuario.

## Cómo probarla
1. Descomprime el ZIP.
2. Para probar rápidamente, abre `index.html` en un navegador moderno. La funcionalidad principal funciona con almacenamiento local.
3. Para probar la instalación PWA/offline correctamente, sirve la carpeta desde un servidor local (por ejemplo VS Code Live Server).
4. En iPhone, una vez publicada bajo HTTPS, se puede añadir a pantalla de inicio.

## Próximas fases
- Importación real de CSV/Excel (la V1 incluye restauración JSON; la importación CSV/Excel queda como siguiente paso).
- Mapa real y geocodificación.
- WhatsApp.
- Rutas comerciales.
- Recordatorios/push.
- Estadística avanzada y comparativa año anterior.
- Autenticación, backend, sincronización y multiusuario.
- Roles de administrador y permisos.
