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

## Registro de usuarios (sin envio automatico)
- El admin crea un registro pendiente desde /admin/usuarios.
- Se comparte manualmente el link de registro.
- La invitacion vence al fin del dia.

---

## Deploy

### Repositorio GitHub
- URL: https://github.com/GABRlEL0/ronda
- Rama principal: `main`

### Hosting de producción
- URL pública: **https://duts.com.ar/ronda/**
- Plataforma: cPanel compartido (FTP)
- Usuario FTP: `ronda@duts.com.ar`
- Host FTP: `duts.com.ar`
- El root del FTP de este usuario apunta a `duts.com.ar/ronda/` — **subir siempre al `/` del FTP**.

> ⚠️ **IMPORTANTE — base path:**
> La app vive en `/ronda/`, por eso el build **siempre** debe hacerse con `VITE_BASE=/ronda/`.
> Si se usa `VITE_BASE=/` los assets darán 404 porque el servidor los buscará en `duts.com.ar/assets/`
> en lugar de `duts.com.ar/ronda/assets/`.

### Comando de deploy (un solo paso)
```bash
./deploy.sh "descripción del cambio"
```

El script `deploy.sh` hace todo en orden:
1. Build con `VITE_BASE=/ronda/`
2. `git add -A && git commit && git push origin main`
3. `lftp mirror` del `dist/` al FTP (`duts.com.ar`)

> **Requisito:** tener `lftp` instalado (`brew install lftp`).

### También disponible vía Firebase Hosting (secundario)
- URL: https://sodero-app.web.app
- Proyecto Firebase: `sodero-app`
- Deploy: `firebase deploy --only hosting --project sodero-app`
  (requiere `npm run build` previo con `VITE_BASE=/ronda/`)

### Apache (SPA routing)
Se incluye `public/.htaccess` para que Vite lo copie dentro de `dist/` y Apache haga
fallback a `index.html` en rutas como `/driver` o `/admin`.
