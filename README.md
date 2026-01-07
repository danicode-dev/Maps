# Granada Guide (Private)

Monorepo full-stack con backend Spring Boot + MariaDB y frontend React (Vite) con mapa Leaflet/OpenStreetMap.

## Requisitos
- Docker + Docker Compose
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

## URLs
- API: http://localhost:8080/api
- Swagger: http://localhost:8080/swagger-ui/index.html
- Frontend: http://localhost:5173
- Adminer: http://localhost:8081

## Notas
- Subida de fotos en `backend/uploads` (se sirve en `/uploads/**` con token via query param).
- PWA: abre en Safari iOS y usa "Anadir a pantalla de inicio".
