# Roadmap - Ronda

## Fase 1: Cimientos
- [x] Vite + React + Tailwind
- [x] Firebase (Auth + Firestore) via variables de entorno
- [x] Estructura de carpetas + router + proteccion por rol
- [x] Login persistente

## Fase 2: Admin (ABM)
- [x] Layout Admin con navegacion persistente
- [x] Productos (CRUD + stock hibrido)
- [x] Clientes (CRUD + saldos iniciales)

## Fase 3: Rondas (Gestion de orden)
- [x] Vista por dia (Lun-Sab)
- [x] Drag & Drop con handle
- [x] Guardado por batch (boton "Guardar orden")
- [x] Defaults: nuevos clientes con `routeOrder` alto para quedar al final

## Fase 4: Driver (Operacion)
- [x] Lista del dia segun `routeDay` + orden por `routeOrder`
- [x] Drag & Drop al vuelo (handle) con auto-guardado al soltar
- [x] Modal/Sheet de entrega (productos + envases + pago + metodo)
- [x] Omitir (visita fallida sin cambiar saldos)
- [x] Mapas con fallback coords/address
- [x] Entrega fuera de ruta (buscador global)
- [x] Red de seguridad "Ver completados hoy"

## Fase 5: Pulido / Deploy
- [x] SPA fallback (Apache .htaccess)
- [x] `VITE_BASE` para deploy en subpath (`/ronda/`)
- [x] Reglas Firestore minimas (auth + roles + orders)

## Fase 6: Inteligencia y Comunicacion (v1.1)
- [x] `products.isWater`
- [x] `clients.lastWaterDate` y `clients.consumptionCycle`
- [x] Semaforo de agua en Driver
- [x] Boton WhatsApp (wa.me con normalizacion)
- [x] Ticket del dia (snapshot local) + resumen solo lectura

## Fase 7: Eficiencia Operativa (v1.3)
- [x] Indicador de sincronizacion (online/offline) en Driver
- [x] Plantillas de WhatsApp rapidas
- [x] Alerta de deuda critica + confirmacion manual
- [x] Hoja de carga (sumatoria de `defaultLoad`)
- [x] Reintentar visitas fallidas
- [x] Invitaciones con vencimiento diario + link copiable
- [x] Reportes (KPIs + charts + export XLSX)
- [x] Dispensers en comodato (inventario) + columna en Admin

## Fase 8: Torre de Control (v1.4)
- [ ] Alertas de bajo costo en Dashboard (stock bajo, deuda critica, semaforo en rojo)
- [ ] Accesos directos operativos (nuevo cliente, reportes, driver)
- [ ] KPIs financieros con cache (opcional, evitar lecturas masivas)
