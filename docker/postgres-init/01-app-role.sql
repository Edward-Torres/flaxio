-- Rol de la app: NO superuser (un superuser con BYPASSRLS ignora las policies de RLS).
-- La app se conecta con este rol; las tablas son propiedad de `flaxio`
-- (migrador), por lo que este rol (non-owner) está sujeto a RLS automáticamente.
-- La contraseña coincide con POSTGRES_PASSWORD del .env.

CREATE ROLE flaxio_app
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION
  PASSWORD 'flaxio-dev-password';

GRANT USAGE, CREATE ON SCHEMA public TO flaxio_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO flaxio_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO flaxio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO flaxio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO flaxio_app;
