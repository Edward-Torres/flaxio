#!/bin/sh
set -e

echo "▶ Esperando a que la base de datos esté disponible..."
sleep 2

echo "▶ Aplicando migraciones con el rol migrador (superuser)..."
DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma migrate deploy

echo "▶ Arrancando API con el rol app (NO superuser, sujeto a RLS)..."
exec node dist/index.js
