# Flaxio — Sistema de gestión comercial multi-usuario

Landing de **gestión comercial** convertida en aplicación full-stack:
frontend React + panel de administración con CRUD por módulo, backend Node/Express/Prisma
con PostgreSQL, todo dockerizado y con seguridad de producción.

## Características principales

- **Auth dinámica**: Registro y login con JWT + refresh token en cookie HttpOnly
- **Multi-tenant por usuario**: Cada usuario solo ve su propia data
- **Módulos**: Dashboard, Ventas, Compras, Inventario, Productos, Categorías, Caja, Cuentas por cobrar, Cuentas por pagar, Gastos, Clientes, Proveedores
- **Stack**: Node/Express/TypeScript + Prisma + PostgreSQL | React/Vite/TypeScript + Tailwind
- **Docker**: Base de datos + backend + frontend orquestados con docker-compose

## Requisitos

- Docker + Docker Compose (recomendado)
- Node.js 20+ (solo para desarrollo local)

## Levantar todo (recomendado)

```bash
# 1) Copiá el .env de ejemplo y cambiá los secretos
cp .env.example .env

# 2) Levantá los 3 servicios
docker compose up --build
```

En el primer arranque el backend corre automáticamente las migraciones de Prisma.

Accesos:

| Recurso | URL |
|---|---|
| Frontend | http://localhost:3010 |
| API (health) | http://localhost:3010/api/health |

## Desarrollo local (sin Docker)

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Migraciones

- En Docker: se aplican solas en el entrypoint
- Manual: `cd backend && npx prisma migrate dev` (desarrollo) o `npx prisma migrate deploy` (producción)

## Seguridad

- **Auth**: JWT de acceso 15 min + refresh token en cookie `HttpOnly; Secure; SameSite=Strict`
- **Contraseñas**: bcrypt con 12 salt rounds
- **Rate limiting**: login limitado a 5 intentos / 15 min por IP
- **Validación**: Zod `.strict()` en todos los endpoints
- **SQL**: solo Prisma
- **Headers**: Helmet + CSP vía nginx
- **CORS**: restringido a `CORS_ORIGIN`
- **Env**: validación al arranque, falla rápido si falta algo crítico
- **Multi-tenant**: todos los endpoints filtran por `userId` del token

## Scripts útiles

```bash
# Backend
cd backend
npm run lint
npm run typecheck
npm run build
npm run seed

# Frontend
cd frontend
npm run lint
npm run build
```

## Licencia

Privado
