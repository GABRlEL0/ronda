# Esquema De Datos (Firestore) - Ronda

Nota: los campos listados son los usados por la app. Puede haber campos adicionales por administracion.

## users
Documento por usuario para permisos.

```json
{
  "uid": "string",
  "email": "string",
  "role": "admin | driver",
  "active": true
}
```

## products

```json
{
  "name": "Bidon 20L",
  "price": 5000,
  "stock": 100,
  "isInfiniteStock": false,
  "isWater": true,
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## clients

```json
{
  "name": "Juan Perez",
  "address": "Av. Siempre Viva 123",
  "coords": { "lat": -34.0, "lng": -64.0 },
  "phone": "string",
  "routeDays": ["Lunes", "Jueves"],
  "routeDay": "Lunes (legacy)",
  "routeOrder": 0,
  "routeOrderByDay": { "Lunes": 0, "Jueves": 5 },
  "balanceMoney": 1500,
  "balanceDelta": 0,
  "balanceBottles": 2,
  "dispenserCount": 1,
  "lastOrderDate": "timestamp | null",
  "lastWaterDate": "timestamp | null",
  "consumptionCycle": 7,
  "defaultLoad": { "water": 2, "soda": 1 },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## orders
Registro inmutable (historial) de cada visita.

```json
{
  "clientId": "ref-client-id",
  "driverId": "ref-user-id",
  "date": "timestamp",
  "visitStatus": "Completada | Fallida",
  "totalPrice": 10000,
  "paymentAmount": 5000,
  "paymentMethod": "Efectivo | Transferencia | null",
  "bottlesReturned": 2,
  "newBalanceMoney": 6500,
  "newBalanceBottles": 2,
  "items": [
    {
      "productId": "id",
      "name": "Bidon 20L",
      "qtyDelivered": 2,
      "priceUnit": 5000,
      "isInfiniteStock": false,
      "isWater": true
    }
  ]
}
```

Notas:
- `bottlesReturned` es el total de envases devueltos en la visita. Ordenes anteriores
  a la auditoria (oct-2026) no lo tienen y guardaban `items[].qtyReturned` repetido en
  cada item (ver `scripts/diagnose-bottles.mjs`).
- `routeOrderByDay` guarda el orden por dia (clientes con varios dias). Si falta,
  se usa `routeOrder`.

## invites
Pendientes de registro (link compartido manualmente).

```json
{
  "email": "string",
  "role": "admin | driver",
  "used": false,
  "createdAt": "timestamp",
  "expiresAt": "timestamp"
}
```

## Indices Requeridos (Firestore)
Definidos en `firestore.indexes.json`:
- `invites`: `used` (Ascending) + `createdAt` (Descending)

Las listas de clientes por dia ya no usan `orderBy` en Firestore (se ordena en el
cliente), asi que no requieren indices compuestos.
