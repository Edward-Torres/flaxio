#!/bin/sh
set -e

UPSTREAM_HOST="${BACKEND_HOST:-backend}"
UPSTREAM_PORT="${BACKEND_PORT:-4000}"

CONF="/etc/nginx/conf.d/default.conf"

if [ -f "$CONF" ]; then
  sed -i "s|http://backend:4000|http://${UPSTREAM_HOST}:${UPSTREAM_PORT}|g" "$CONF" || true
fi

exec "$@"
