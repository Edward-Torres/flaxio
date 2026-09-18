-- =====================================================================
-- Migración: aislamiento multi-tenant vía PostgreSQL RLS (Row Level Security)
-- ---------------------------------------------------------------------
-- GUC `app.user_id`: se setea de forma transaccional (SET LOCAL dentro de
-- `$transaction`) por el middleware en `src/lib/prisma.ts` (AsyncLocalStorage,
-- uno por request).
--   * Tablas "tenant" filtran por `user_id = current_setting('app.user_id', true)`.
--     `user_id` es TEXT -> texto=texto; el 2º arg `true` devuelve NULL si el
--     GUC no está set -> `user_id = NULL` nunca coincide -> denegación por defecto.
--   * Tablas items (sale_items, purchase_items, return_items) filtran vía el
--     padre (sale/purchase/return), ya que no tienen `user_id` propio.
--
-- Rol app: la app se conecta como `flaxio_app`, rol NO superuser y NO
-- owner de las tablas (creado en docker/postgres-init/01-app-role.sql).
-- Como non-owner, RLS le aplica automáticamente (no se necesita FORCE).
-- `flaxio` (superuser/bootstrap) sigue siendo el migrador y dueño.
-- =====================================================================

-- 1. Tablas con columna user_id.
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_categories ON categories FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_products ON products FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE sales          ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_sales ON sales FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE purchases      ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_purchases ON purchases FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_expenses ON expenses FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE customers      ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_customers ON customers FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE suppliers      ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_suppliers ON suppliers FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_cash_movements ON cash_movements FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

ALTER TABLE returns        ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_returns ON returns FOR ALL
  USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

-- 2. Tablas items: filtran a través del padre (no tienen user_id).
ALTER TABLE sale_items     ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_sale_items ON sale_items FOR ALL
  USING (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND s.user_id = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id AND s.user_id = current_setting('app.user_id', true)));

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_purchase_items ON purchase_items FOR ALL
  USING (EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_items.purchase_id AND p.user_id = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM purchases p WHERE p.id = purchase_items.purchase_id AND p.user_id = current_setting('app.user_id', true)));

ALTER TABLE return_items   ENABLE ROW LEVEL SECURITY;
CREATE POLICY isolation_return_items ON return_items FOR ALL
  USING (EXISTS (SELECT 1 FROM returns rt WHERE rt.id = return_items.return_id AND rt.user_id = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM returns rt WHERE rt.id = return_items.return_id AND rt.user_id = current_setting('app.user_id', true)));
