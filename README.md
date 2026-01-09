# Granada Guide (Privado)

Monorepo full-stack con backend Spring Boot + MariaDB y frontend React (Vite) con mapa Leaflet/OpenStreetMap.

## Requisitos
- Docker Desktop + Docker Compose
- Java 17+
- Node.js 18+

## Configuracion rapida
1) Copia `.env.example` a `.env` y ajusta credenciales (especialmente `JWT_SECRET`, minimo 32 caracteres).
2) Levanta MariaDB:
```bash
cd docker
docker compose --env-file ../.env up -d
```
3) Backend:
```bash
cd ../backend
mvn spring-boot:run
```
4) Frontend:
```bash
cd ../frontend
npm install
npm run dev
```

## Usuarios de prueba (seed automatico)
- test1@mail.com / 123456
- test2@mail.com / 123456
- Grupo compartido: Pareja

## Mapa estilo Google
- Por defecto usamos el estilo CARTO Voyager (POIs y negocios visibles).
- Si quieres otro estilo, crea `frontend/.env`:
```
VITE_MAP_TILES_URL=...
VITE_MAP_TILES_ATTRIBUTION=...
VITE_MAP_TILES_SUBDOMAINS=abcd
```

## URLs
- API: http://localhost:8080/api
- Swagger: http://localhost:8080/swagger-ui/index.html
- Frontend: http://localhost:5173
- Adminer: http://localhost:8081

## Despliegue en Oracle Cloud (Docker)
1) Crea una VM Free Tier con Ubuntu 22.04 y asigna IP publica.
2) Abre el puerto 80/TCP en la regla de ingreso (Security List o NSG). Sin dominio, la URL sera HTTP.
3) Conectate por SSH:
```bash
ssh ubuntu@<IP_PUBLICA>
```
4) Instala git si hace falta:
```bash
sudo apt-get update
sudo apt-get install -y git
```
5) Clona el repo y ejecuta el deploy:
```bash
git clone <TU_REPO> granada-guide
cd granada-guide
bash scripts/deploy-oracle.sh
```
6) Al final veras el enlace:
- http://<IP_PUBLICA>/
- http://<IP_PUBLICA>/api
7) Si quieres cambiar CORS o credenciales, edita `.env.prod` y reejecuta el script.

## Notas
- Subida de fotos en `backend/uploads` (se sirve via `/api/photos/{id}/file`).
- PWA: abre en Safari iOS y usa "Anadir a pantalla de inicio".
- Busqueda usa Nominatim (requiere acceso a internet desde el navegador).
