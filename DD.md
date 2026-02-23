DD.md (Documento de Diseno) quedo como archivo historico de especificacion inicial.

La documentacion vigente del proyecto se mantiene en:
- `HANDSHAKE.md`
- `SPECS.md`
- `SCHEMA.md`
- `ROADMAP.md`
- `README.md`

Actualizaciones clave incorporadas en la implementacion (v1.1):
- **Ausentes:** "No estaba / Omitir" registra visita `Fallida` sin tocar saldos.
- **Metodo de pago:** `Efectivo | Transferencia` guardado en `orders`.
- **Mapas con fallback:** `coords` si existe, sino `address` codificada.
- **Fechas:** `lastOrderDate` siempre; `lastWaterDate` solo si la entrega incluye un producto con `isWater=true`.
- **Semaforo de agua:** basado en `clients.lastWaterDate` y `clients.consumptionCycle`.
- **WhatsApp:** boton `wa.me` con normalizacion de numero.
- **Fuera de ruta:** buscador global + aparece en historial del dia + ficha resumen/ticket (snapshot local).

Actualizaciones clave incorporadas en la implementacion (v1.3):
- **Sync:** indicador online/offline en Driver.
- **Hoja de carga:** sumatoria por `defaultLoad` en Driver.
- **Deuda critica:** alerta + confirmacion manual antes de entregar.
- **Reintentar:** visitas fallidas pueden volver a lista.
- **Usuarios:** registros pendientes con link copiable (vencimiento diario).
- **Reportes:** KPIs + charts + export XLSX.
- **Dispensers:** campo de comodato en clientes + columna en Admin + chip en Driver.



### **1\. `HANDSHAKE.md`**

*(Tu "apretón de manos" con la IA. Es el primer archivo que debe leer).*

Markdown  
\# Estado del Proyecto: Ronda (PWA)

\#\# Contexto  
Estamos construyendo \*\*Ronda\*\*, una Web App (PWA) para logística de reparto de agua y soda.  
\- \*\*Rol:\*\* Director (Usuario) y AI (Desarrollador).  
\- \*\*Arquitectura:\*\* Frontend en React (Vite) hosteado en VodaHost (Static) \+ Backend as a Service (Firebase Firestore & Auth).  
\- \*\*Estado Actual:\*\* Fase de inicialización. Definición de arquitectura y requisitos completada.

\#\# Objetivo Principal  
Crear un sistema con dos interfaces:  
1\. \*\*Ronda Admin (Web Desktop):\*\* Panel de control para cargar clientes, productos, inventario y configurar las "Rondas" (rutas) de reparto.  
2\. \*\*Ronda Driver (Mobile PWA):\*\* Interfaz ultra-simplificada para el repartidor. Permite marcar entregas, cobros y movimiento de envases en tiempo real, con capacidad offline.

\#\# Reglas de Negocio Clave (Inmutables)  
1\. \*\*Envases (Saldo de Posesión):\*\* No cobramos envases por transacción, controlamos el \*Saldo de Posesión\* del cliente.  
   \- Fórmula: \`Nuevo Saldo Envases \= Saldo Anterior \+ (Entregados Llenos \- Devueltos Vacíos)\`.  
   \- \*Ejemplo:\* Si tiene 3, le doy 3 y me devuelve 3, su saldo sigue siendo 3\.  
2\. \*\*Saldos Monetarios (Cta Cte):\*\* El sistema maneja Cuenta Corriente automática.  
   \- Fórmula: \`Nuevo Saldo $$ \= Saldo Anterior \+ (Total Pedido \- Pago Recibido en el acto)\`.  
3\. \*\*Rutas (Rondas):\*\* Los clientes se organizan por Día de Visita y Orden Secuencial.  
   \- La App debe permitir "Drag & Drop" persistente para reorganizar la ruta del día.  
4\. \*\*Stock Híbrido:\*\*  
   \- En el Admin, cada producto tiene un checkbox: \`Stock Infinito\`.  
   \- Si es \`FALSE\`, se descuenta stock al confirmar entrega. Si es \`TRUE\`, no se controla.

\#\# Próximo Paso Inmediato  
Iniciar la configuración del proyecto en Vite y la conexión con Firebase según el \`ROADMAP.md\`.

---

### **2\. `SPECS.md`**

*(Especificaciones Técnicas y de Diseño)*

Markdown  
\# Especificaciones Técnicas \- Ronda

\#\# 1\. Stack Tecnológico  
\- \*\*Frontend Framework:\*\* React \+ Vite.  
\- \*\*Lenguaje:\*\* JavaScript (ES6+).  
\- \*\*Estilos:\*\* Tailwind CSS (Prioridad: Mobile-first, botones grandes, alto contraste).  
\- \*\*Base de Datos:\*\* Firebase Firestore.  
\- \*\*Autenticación:\*\* Firebase Auth.  
\- \*\*Hosting:\*\* VodaHost (Build estático en carpeta \`/dist\`).  
\- \*\*Mapas:\*\* Deep Links externos (\`geo:lat,long\`) para abrir Google Maps/Waze nativo.

\#\# 2\. Módulos del Sistema

\#\#\# A. Ronda Admin (Escritorio)  
\- \*\*Dashboard:\*\* Resumen rápido de ventas del día.  
\- \*\*ABM Clientes:\*\*  
  \- Datos: Nombre, Dirección, Link Maps, Teléfono, Día de Ruta (ej: Lunes).  
  \- Estado: Saldo $$ Actual, Saldo Envases Actual.  
\- \*\*ABM Productos:\*\*  
  \- Datos: Nombre, Precio, Stock Actual.  
  \- Config: Checkbox "Stock Infinito".  
\- \*\*Gestor de Rondas:\*\*  
  \- Vista filtrada por días (Pestañas: Lun, Mar, Mie...).  
  \- Lista reordenable (Drag & Drop) para definir el recorrido óptimo.

\#\#\# B. Ronda Driver (Mobile PWA)  
\- \*\*Login:\*\* Persistente.  
\- \*\*Vista "Mi Ronda" (Home):\*\*  
    \- Lista vertical infinita de los clientes del día actual.  
    \- Tarjeta de Cliente: Nombre, Dirección, Deuda pendiente (si existe).  
    \- Funcionalidad: Drag & Drop para ajustar orden "al vuelo".  
\- \*\*Vista "Entrega Rápida" (Modal/Sheet):\*\*  
    \- \*\*Productos:\*\* Listado con contadores gigantes \`+\` / \`-\`.  
    \- \*\*Envases:\*\* Input numérico para "Envases Devueltos" (Por defecto igual a entregados).  
    \- \*\*Dinero:\*\* Input numérico "Pago Recibido" (Por defecto 0 o Total).  
    \- \*\*Botón Acción:\*\* "Confirmar Ronda".  
        \- Feedback visual de éxito.  
        \- Elimina/Oculta la tarjeta de la lista principal.  
\- \*\*Botón Flotante:\*\* "Venta Fuera de Ruta" (Buscador global de clientes).

\#\# 3\. UI/UX Guidelines  
\- \*\*Filosofía:\*\* "Anti-frustración". El repartidor suele tener manos mojadas o usar guantes.  
\- \*\*Touch Targets:\*\* Botones de acción principales \> 48px de altura.  
\- \*\*Navegación:\*\* Sin menús anidados. Flujo plano: Lista \-\> Modal \-\> Lista.

---

### **3\. `SCHEMA.md`**

*(Estructura de Base de Datos para Firestore)*

Markdown  
\# Esquema de Datos Firestore \- Ronda

\#\# Colección: \`users\`  
Documento para permisos.  
\`\`\`json  
{  
  "uid": "string",  
  "email": "string",  
  "role": "admin" | "driver",  
  "name": "string"  
}

## **Colección: `products`**

JSON  
{  
  "id": "auto-id",  
  "name": "Bidón 20L",  
  "price": 5000, // Number  
  "stock": 100, // Number (Solo relevante si isInfiniteStock es false)  
  "isInfiniteStock": false, // Boolean (Configurable en Admin)  
  "isActive": true  
}

## **Colección: `clients`**

JSON  
{  
  "id": "auto-id",  
  "name": "Juan Perez",  
  "address": "Av. Siempre Viva 123",  
  "coords": { "lat": \-34.00, "lng": \-64.00 }, // Opcional  
  "phone": "353...",  
  "routeDay": "Lunes", // String o Int (1=Lunes)  
  "routeOrder": 1, // Number (Indice para ordenar la lista)  
  "balanceMoney": 1500, // Saldo ($). Positivo \= Deuda del cliente.  
  "balanceBottles": 2, // Cantidad de envases vacíos en casa del cliente.  
  "lastOrderDate": "timestamp"  
}

## **Colección: `orders` (Historial)**

Registro inmutable de cada visita.

JSON  
{  
  "id": "auto-id",  
  "clientId": "ref-client-id",  
  "driverId": "ref-user-id",  
  "date": "timestamp",  
  "totalPrice": 10000, // Costo total de los productos entregados  
  "paymentAmount": 5000, // Lo que pagó en el momento  
  "newBalanceMoney": 6500, // Snapshot del saldo resultante  
  "items": \[  
    {  
      "productId": "id",  
      "name": "Bidón 20L",  
      "qtyDelivered": 2, // Llenos entregados  
      "qtyReturned": 2, // Vacíos recuperados  
      "priceUnit": 5000  
    }  
  \]  
}

---

### **4\. `ROADMAP.md`**

*(Plan de ejecución paso a paso)*

Markdown  
\# Roadmap de Desarrollo \- Ronda

\#\# Fase 1: Cimientos (Día 1\)  
\- \[ \] Inicializar proyecto Vite (React \+ JS).  
\- \[ \] Instalar: Tailwind CSS, Firebase SDK, React Router, \`dnd-kit\` (o similar para Drag\&Drop).  
\- \[ \] Configurar Firebase (Crear proyecto, activar Firestore y Auth).  
\- \[ \] Crear estructura de carpetas y variables de entorno.  
\- \[ \] Implementar Login Page simple.

\#\# Fase 2: El Cerebro (Admin Panel) (Día 2-3)  
\- \[ \] Layout Admin (Sidebar \+ Content).  
\- \[ \] \*\*Módulo Productos:\*\* Crear, Editar, Eliminar. Lógica de Checkbox "Stock Infinito".  
\- \[ \] \*\*Módulo Clientes:\*\* Crear, Editar. Asignación de "Día de Ruta".  
\- \[ \] \*\*Simulación:\*\* Cargar 5 productos y 10 clientes ficticios.

\#\# Fase 3: La Lógica de la Ronda (Día 4\)  
\- \[ \] Vista "Gestión de Rutas" en Admin.  
\- \[ \] Implementar Drag & Drop para ordenar clientes por día.  
\- \[ \] Persistencia: Guardar el nuevo \`routeOrder\` en Firestore al soltar la tarjeta.

\#\# Fase 4: La Herramienta del Repartidor (Día 5-7)  
\- \[ \] Layout Mobile (Header simple, Full width).  
\- \[ \] \*\*Vista Home:\*\* Query a Firestore filtrando por \`routeDay \== DiaActual\`.  
\- \[ \] \*\*Modal de Entrega:\*\*  
    \- Componente contador (+/-) para productos.  
    \- Lógica de cálculo de Envases (\`Saldo \+ Entregados \- Devueltos\`).  
    \- Lógica de Saldo $$ (\`Saldo \+ Precio \- Pago\`).  
\- \[ \] \*\*Transacción:\*\* Crear documento en \`orders\` y actualizar atómicamente al \`client\`.

\#\# Fase 5: Pulido y Despliegue (Día 8\)  
\- \[ \] Testing de UX (Tamaño de botones, legibilidad).  
\- \[ \] Build de producción (\`npm run build\`).  
\- \[ \] Guía de subida a VodaHost (FTP).

---

### **5\. `README.md`**

*(Instrucciones de uso)*

Markdown  
\# Ronda \- Sistema de Gestión de Reparto

Bienvenido al repositorio de \*\*Ronda\*\*.

\#\# Configuración Inicial  
1\.  \*\*Clonar:\*\* Descarga este código.  
2\.  \*\*Instalar:\*\* Ejecuta \`npm install\` en la terminal.  
3\.  \*\*Ambiente:\*\* Crea un archivo \`.env\` en la raíz con tus credenciales de Firebase:  
    \`\`\`env  
    VITE\_API\_KEY=tu\_api\_key  
    VITE\_AUTH\_DOMAIN=tu\_proyecto.firebaseapp.com  
    VITE\_PROJECT\_ID=tu\_proyecto  
    \`\`\`  
4\.  \*\*Correr:\*\* Usa \`npm run dev\` para iniciar en modo local.

\#\# Despliegue en VodaHost  
Este proyecto genera una SPA (Single Page Application) estática.  
1\.  Ejecuta \`npm run build\`.  
2\.  Sube el contenido de la carpeta \`dist\` a tu hosting.  
3\.  \*\*Importante:\*\* Asegúrate de configurar tu servidor para redirigir todas las rutas a \`index.html\` (Rewrite Rule), ya que usamos React Router.
