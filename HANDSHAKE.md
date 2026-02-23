# Estado Del Proyecto: Ronda (PWA)

## Contexto
Estamos construyendo **Ronda**, una Web App (PWA) para logistica de reparto de agua y soda.

- **Rol:** Director (usuario) y Desarrollador (IA).
- **Arquitectura:** Frontend React (Vite) hosteado en hosting estatico + Firebase (Auth + Firestore).
- **Objetivo:** 2 interfaces:
  - **Ronda Admin (desktop):** gestion de clientes/productos y orden de rondas.
  - **Ronda Driver (mobile):** ejecucion de entregas, cobro, envases, y ajustes de orden "al vuelo".

## Reglas De Negocio (Claves)
1) **Envases (saldo de posesion):**
   - `nuevoSaldoEnvases = saldoAnterior + (entregadosLlenos - devueltosVacios)`
2) **Cuenta corriente (saldo monetario):**
   - `nuevoSaldo$ = saldoAnterior + (totalPedido - pagoRecibido)`
3) **Rondas (orden de visita):**
   - Clientes organizados por `routeDay` y `routeOrder`.
   - Orden reordenable por Drag & Drop y persistente en Firestore.
4) **Stock hibrido:**
   - Producto con `isInfiniteStock=true` no descuenta stock.
   - Si `isInfiniteStock=false`, se descuenta stock al confirmar entrega.

## Reglas Operativas (UX / Calle)
- **Anti-frustracion:** targets tactiles grandes (>= 48px).
- **Mapas con fallback:** prioriza `coords.lat/lng` si existe, sino usa `address` en Google Maps.
- **Metodo de pago:** `Efectivo` o `Transferencia` guardado en `orders`.
- **Ausentes:** boton "No estaba / Omitir" marca visita `Fallida` sin modificar saldos.
- **Entrega fuera de ruta:** buscador global de clientes, registra igual que una entrega normal.
- **Red de seguridad:** "Ver completados hoy" muestra visitas del dia (incluye fuera de ruta) y permite abrir un resumen (solo lectura).
- **Reintentar:** visitas fallidas pueden volver a la lista para reintento.
- **Deuda critica:** requiere confirmacion manual antes de entregar.
- **Productos:** se listan solo activos con stock > 0 (o infinito).

## Roles y Accesos
- `driver` no puede entrar a Admin.
- `admin` puede entrar a Admin y tambien usar Driver (cuando el duenio reparte).

## Estado Actual
- Admin funcional: ABM clientes/productos + rondas (DnD persistente).
- Admin adicional: usuarios (pendientes con link) + reportes + dispensers en comodato.
- Driver funcional: lista del dia + DnD por handle + entrega/omitir + fuera de ruta + semaforo de agua + WhatsApp + resumen/ticket del dia + hoja de carga + sync + deuda critica.
