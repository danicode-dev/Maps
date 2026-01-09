# CHANGELOG

## 2026-01-08
- Mantengo Spring Boot + MariaDB y simplifico estados en `places` para evitar tabla `place_status`.
- Grupo compartido por defecto "Pareja" con seed automatico de 2 usuarios.
- UI rehacida a mapa full-screen con drawer compacto, filtros y alta rapida desde el mapa.
- Fotos gestionadas desde el detalle con subida y galeria en el mismo panel.
- Mapa con estilo tipo Google (CARTO Voyager) y listado separado de pendientes/visitados.
- Marca movida a la barra superior y panel de perfil en la esquina superior derecha.
- Fotos servidas via `/api/photos/{id}/file` con carga autenticada en el frontend.
