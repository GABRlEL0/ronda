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
  "newBalanceMoney": 6500,
  "newBalanceBottles": 2,
  "items": [
    {
      "productId": "id",
      "name": "Bidon 20L",
      "qtyDelivered": 2,
      "qtyReturned": 2,
      "priceUnit": 5000,
      "isInfiniteStock": false,
      "isWater": true
    }
  ]
}
```

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
Si la consola muestra `The query requires an index`, crear:
- `clients`: `routeDay` (Ascending) + `routeOrder` (Ascending)
- `clients`: `routeDay` (Ascending) + `name` (Ascending)
- `products`: `isActive` (Ascending) + `name` (Ascending)
- `invites`: `used` (Ascending) + `createdAt` (Descending)
