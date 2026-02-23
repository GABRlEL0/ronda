# Ronda - Sistema de Gestión de Reparto

Bienvenido al repositorio de **Ronda**.

## Configuración Inicial
1. **Clonar:** Descarga este código.
2. **Instalar:** Ejecuta `npm install` en la terminal.
3. **Ambiente:** Crea un archivo `.env` en la raíz con tus credenciales de Firebase:
   ```env
   VITE_FIREBASE_API_KEY=tu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu_proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   VITE_FIREBASE_APP_ID=tu_app_id
   VITE_BASE=/
   ```
4. **Correr:** Usa `npm run dev` para iniciar en modo local.

## Documentacion
- `HANDSHAKE.md`: contexto, reglas y estado del proyecto.
- `SPECS.md`: especificaciones tecnicas y UX.
- `SCHEMA.md`: esquema Firestore e indices requeridos.
- `ROADMAP.md`: fases y entregables.

## Credenciales de Prueba
Completar con usuarios reales creados en Firebase Auth + su documento en `users/{uid}` con `role`.

- Admin:
  - Email: (completar)
  - Password: (completar)
- Driver:
  - Email: (completar)
  - Password: (completar)

## Seeding (Clientes)
Para crear 20 clientes ficticios distribuidos de Lunes a Sabado:

Requisitos:
- Usuario admin existente en Firebase Auth.
- Documento `users/{uid}` con `role: "admin"`.

Ejecutar:
- Definir credenciales de seed en la terminal:
  - `SEED_EMAIL` y `SEED_PASSWORD`
- Correr:
  - `npm run seed:clients`

## Checklist Firestore (Indices)
Si la consola del navegador muestra `The query requires an index`, hay que crearlo en Firebase Console:

- `clients`: `routeDay` (Ascending) + `routeOrder` (Ascending)
- `clients`: `routeDay` (Ascending) + `name` (Ascending)
- `clients`: `routeDays` (Array-contains) + `routeOrder` (Ascending)
- `clients`: `routeDays` (Array-contains) + `name` (Ascending)
- `products`: `isActive` (Ascending) + `name` (Ascending)
- `invites`: `used` (Ascending) + `createdAt` (Descending)

## Despliegue en VodaHost
Este proyecto genera una SPA (Single Page Application) estática.
1. Ejecuta `npm run build`.
2. Sube el contenido de la carpeta `dist` a tu hosting.
3. **Importante:** Asegúrate de configurar tu servidor para redirigir todas las rutas a `index.html` (Rewrite Rule), ya que usamos React Router.

### Apache (.htaccess)
Se incluye `public/.htaccess` para que Vite lo copie dentro de `dist/` y Apache haga fallback a `index.html` en rutas como `/driver` o `/admin`.

### Deploy en subcarpeta (/ronda/)
Si la app se publica en un subpath (ej: `https://example.com/ronda/`):
- Configurar `VITE_BASE=/ronda/` antes del build.
- El `.htaccess` incluido usa `RewriteBase /ronda/`.

## Registro de usuarios (sin envio automatico)
- El admin crea un registro pendiente desde /admin/usuarios.
- Se comparte manualmente el link de registro.
- La invitacion vence al fin del dia.
