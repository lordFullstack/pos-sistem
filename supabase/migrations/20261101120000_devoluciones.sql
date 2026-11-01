-- Devoluciones: órdenes canceladas después de cobrarlas.
-- Se guardan dentro de la venta original para no perder el cobro ni la devolución.
-- Cada elemento: { order_id, at, subtotal, tax, total, staff_id, lines: [{ name, note, unit_price, qty }] }

alter table public.sales
  add column refunds jsonb not null default '[]'::jsonb
  check (jsonb_typeof(refunds) = 'array');

comment on column public.sales.refunds is
  'Devoluciones de órdenes de esta venta. Ventas netas = total - suma de refunds[].total.';
