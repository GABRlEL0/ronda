# Especificaciones Tecnicas - Ronda

## Stack
- **Frontend:** React + Vite (JS)
- **UI:** Tailwind CSS (mobile-first en Driver / desktop-first en Admin)
- **Auth:** Firebase Authentication (Email/Password)
- **DB:** Firebase Firestore
- **Ruteo:** React Router (SPA con fallback a `index.html`)
- **DnD:** dnd-kit
- **Iconos:** lucide-react

## Hosting (Subpath)
El proyecto puede desplegarse en un subpath (ej: `/ronda/`).

- `VITE_BASE` controla el base path del build (assets y rutas).
- `BrowserRouter` usa `basename={import.meta.env.BASE_URL}`.
- En Apache, se incluye `.htaccess` para fallback SPA bajo `/ronda/`.

## Modulos

### Admin (Desktop)
- Dashboard (placeholder)
- Clientes
  - Campos base + saldos iniciales + `consumptionCycle` (dias).
  - `defaultLoad` (bidones/soda) para hoja de carga.
  - Dispensers en comodato (`dispenserCount`) como inventario.
- Productos
  - Stock hibrido (`isInfiniteStock`) y bandera `isWater`.
- Rondas
  - Tabs por dia (Lun-Sab)
  - Drag & Drop con handle
  - Persistencia por batch en Firestore (boton "Guardar orden")
- Usuarios
  - Alta mediante registros pendientes (link copiable) con vencimiento diario.
- Reportes
  - KPIs + charts + export XLSX.

### Driver (Mobile)
- Header con marca + dia/fecha (sin menus).
- Lista del dia (segun `routeDay` del dia actual), ordenada por `routeOrder`.
- Drag & Drop "al vuelo" (handle en circulo de orden):
  - Auto-guardado al soltar (persiste `routeOrder`).
- Tarjeta de cliente (compacta):
  - Nombre, direccion, deuda, envases.
  - Indicador de estado de agua (semaforo).
  - Chip de dispensers en comodato (solo lectura).
  - Acciones: Maps + WhatsApp (si hay telefono).
- Modal/Sheet de entrega:
  - Contadores grandes (+/-) por producto
  - Envases devueltos (default = entregados)
  - Pago + metodo (Efectivo/Transferencia)
  - Confirmar / No estaba
- Entrega fuera de ruta:
  - Buscador global (sin listar hasta tipear >=2 caracteres).
- Historial del dia (Ver completados hoy):
  - Incluye visitas de ruta y fuera de ruta.
  - Abre ficha resumen (solo lectura) con ticket: items + total + pago/metodo + nuevo saldo.
 - Indicador de sincronizacion (online/offline).
 - Hoja de carga (totales por consumo habitual).
 - Deuda critica con confirmacion manual.
 - Reintentar visitas fallidas.

## UX Guidelines
- Botones/targets grandes (>= 48px).
- Acciones criticas separadas (Confirmar vs Omitir).
- Feedback inmediato (toast + cierre de modal + ocultar cliente).
