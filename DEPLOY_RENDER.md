# Despliegue en Render.com - Granada Guide

Guía paso a paso para desplegar tu aplicación en Render de forma **gratuita**.

## Requisitos Previos

1. Cuenta en [GitHub](https://github.com) con tu código subido
2. Cuenta en [Render](https://render.com) (registro gratuito con GitHub)

---

## Paso 1: Subir código a GitHub

Si aún no tienes el código en GitHub:

```bash
cd PROYECTOPERSONAL_MAPS
git init
git add .
git commit -m "feat: add Render deployment configuration"
git remote add origin https://github.com/TU_USUARIO/granada-guide.git
git push -u origin main
```

---

## Paso 2: Crear cuenta en Render

1. Ve a [render.com](https://render.com)
2. Click en **"Get Started"**
3. **Regístrate con GitHub** (más fácil)
4. Autoriza Render para acceder a tus repos

---

## Paso 3: Desplegar con Blueprint

1. En el Dashboard de Render, click en **"New +"** → **"Blueprint"**
2. Conecta tu repositorio **granada-guide**
3. Render detectará automáticamente `render.yaml`
4. Revisa los servicios que se crearán:
   - 🗄️ **granada-guide-db** (PostgreSQL)
   - ⚙️ **granada-guide-api** (Backend Spring Boot)
   - 🌐 **granada-guide** (Frontend React)
5. Click en **"Apply"**
6. **Espera 5-10 minutos** mientras construye todo

---

## Paso 4: Configurar URLs

Una vez desplegado, actualiza las URLs en el render.yaml con las reales:

1. Ve a tu servicio **granada-guide-api** → Settings → Environment
2. Copia la URL del backend (ej: `https://granada-guide-api-xxxx.onrender.com`)
3. Ve a **granada-guide** (frontend) → Settings → Environment
4. Actualiza `VITE_API_URL` con la URL real del backend
5. En **Redirects/Rewrites**, actualiza la URL del rewrite `/api/*`

O simplemente edita el archivo `render.yaml` con las URLs finales y haz push.

---

## URLs Finales

Después del deploy tendrás:

| Servicio | URL |
|----------|-----|
| **Frontend** | `https://granada-guide.onrender.com` |
| **Backend API** | `https://granada-guide-api.onrender.com/api` |
| **Swagger** | `https://granada-guide-api.onrender.com/swagger-ui/index.html` |

---

## Verificación

1. Abre tu frontend: `https://granada-guide.onrender.com`
2. Inicia sesión con usuario de prueba:
   - Email: `test1@mail.com`
   - Password: `123456`
3. Verifica que el mapa carga correctamente
4. Crea un lugar de prueba

---

## Notas Importantes

### ⏰ Sleep Mode (Plan Gratuito)
- La app se **"duerme" tras 15 minutos** sin uso
- Primer request tras inactividad: **~30 segundos**
- Después funciona normal

### 📦 Límites del Plan Gratuito
- 512 MB RAM (suficiente para Spring Boot)
- Base de datos: 256 MB
- Ancho de banda: 100 GB/mes

### 🔒 Seguridad
- `JWT_SECRET` se genera automáticamente (seguro)
- HTTPS incluido
- Variables de entorno encriptadas

---

## Troubleshooting

### El backend no arranca
1. Ve a **Logs** del servicio
2. Busca errores de conexión a DB
3. Verifica que la DB esté "Available"

### El frontend no conecta con el API
1. Verifica que las URLs en `render.yaml` son correctas
2. Comprueba que CORS incluye tu URL de frontend

### Primer request muy lento
- **Normal** en plan gratuito (cold start)
- Espera ~30 segundos
- Después todo funciona rápido

---

## Soporte

Si tienes problemas:
1. Revisa los **Logs** en Render Dashboard
2. Verifica los **Health Checks** (deben estar verdes)
3. Consulta [Render Docs](https://render.com/docs)
