-- POS Moderno · esquema inicial para Supabase
-- Cada fila pertenece a un negocio (business_id). Las cuentas de Supabase (auth.users)
-- se unen a un negocio en business_members; RLS deja ver y cambiar solo lo de sus negocios.
-- El personal de la caja (con rol y PIN) vive en staff: no son cuentas de Supabase.
-- Dinero en pesos enteros (bigint). Cantidades de inventario con 3 decimales.

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Negocios y miembros
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  nit text not null default '',
  biz_type text not null default 'cafe' check (biz_type in ('cafe', 'resto', 'helado', 'pan', 'rapida')),
  accent text not null default '#1F5F45',
  tax_mode text not null default 'impo' check (tax_mode in ('impo', 'iva', 'none')),
  text_size text not null default 'normal' check (text_size in ('normal', 'grande')),
  receipt_footer text not null default '',
  logo_path text,
  remind_backup boolean not null default true,
  next_order_number integer not null default 1 check (next_order_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'manager', 'device')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

-- security definer: evita que las políticas de business_members se llamen a sí mismas.
create or replace function public.is_business_member(b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = b and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_business_owner(b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = b and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Crea un negocio y deja a quien lo crea como dueño.
create or replace function public.create_business(p_name text, p_biz_type text default 'cafe')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para crear un negocio';
  end if;
  insert into public.businesses (name, biz_type) values (p_name, p_biz_type) returning id into new_id;
  insert into public.business_members (business_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end;
$$;

revoke execute on function public.create_business(text, text) from public, anon;
grant execute on function public.create_business(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Personal de la caja (roles y PIN)
-- ---------------------------------------------------------------------------

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  email text not null default '',
  role text not null check (role in ('admin', 'cajero', 'barista')),
  active boolean not null default true,
  -- SHA-256 de 'pos-moderno:<pin_salt>:<PIN>'. pin_salt es el id con que se creó el PIN en la app.
  pin_hash text,
  pin_salt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index staff_business_idx on public.staff (business_id);

-- ---------------------------------------------------------------------------
-- Menú
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_business_idx on public.categories (business_id, sort);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  description text not null default '',
  price bigint not null check (price >= 0),
  icon text not null default 'plate',
  tint text not null default '#EFE6DC',
  -- Ruta en el bucket product-images: <business_id>/<product_id>.jpg
  image_path text,
  -- Grupos de opciones: [{ name, type: 'one'|'many', min, max (número o 'scoops'), choices: [{ label, add, scoops? }] }]
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_business_idx on public.products (business_id, sort);
create index products_category_idx on public.products (category_id);

-- ---------------------------------------------------------------------------
-- Mesas, órdenes y ventas
-- ---------------------------------------------------------------------------

-- Zonas del local (Salón principal, Terraza, Segundo piso…), editables desde la app.
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index zones_business_idx on public.zones (business_id, sort);

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  label text not null,
  -- restrict: no se puede borrar una zona que todavía tiene mesas.
  zone_id uuid not null references public.zones (id) on delete restrict,
  seats integer not null check (seats > 0),
  pos_x integer not null default 0,
  pos_y integer not null default 0,
  status text not null default 'libre' check (status in ('libre', 'ocupada', 'cuenta', 'reservada')),
  guests integer not null default 0 check (guests >= 0),
  waiter text not null default '',
  opened_at timestamptz,
  reservation_time text,
  reservation_note text,
  updated_at timestamptz not null default now(),
  unique (business_id, label)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  number integer not null,
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('mesa', 'llevar')),
  table_id uuid references public.dining_tables (id) on delete set null,
  customer text,
  status text not null check (status in ('pendiente', 'prep', 'lista', 'entregada', 'cancelada')),
  paid boolean not null default false,
  note text,
  updated_at timestamptz not null default now(),
  unique (business_id, number)
);
create index orders_open_idx on public.orders (business_id, status, created_at desc);
create index orders_table_idx on public.orders (table_id) where paid = false;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Null si el producto se borró después; name/note/unit_price guardan lo vendido.
  product_id uuid references public.products (id) on delete set null,
  line_key text not null,
  name text not null,
  note text not null default '',
  unit_price bigint not null check (unit_price >= 0),
  qty integer not null check (qty > 0)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  at timestamptz not null default now(),
  subtotal bigint not null check (subtotal >= 0),
  tax bigint not null check (tax >= 0),
  total bigint not null check (total >= 0),
  method text not null check (method in ('efectivo', 'tarjeta', 'transferencia')),
  staff_id uuid references public.staff (id) on delete set null,
  order_ids uuid[] not null default '{}'
);
create index sales_business_at_idx on public.sales (business_id, at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  line_key text not null,
  name text not null,
  note text not null default '',
  unit_price bigint not null check (unit_price >= 0),
  qty integer not null check (qty > 0)
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_product_idx on public.sale_items (business_id, product_id);

create table public.cash_closures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  at timestamptz not null default now(),
  staff_id uuid references public.staff (id) on delete set null,
  expected_cash bigint not null,
  counted_cash bigint not null,
  difference bigint generated always as (counted_cash - expected_cash) stored,
  sales_count integer not null,
  sales_total bigint not null
);
create index cash_closures_business_idx on public.cash_closures (business_id, at desc);

-- ---------------------------------------------------------------------------
-- Inventario y contabilidad
-- ---------------------------------------------------------------------------

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  category text not null,
  unit text not null check (unit in ('kg', 'L', 'und')),
  stock numeric(12, 3) not null default 0,
  min_stock numeric(12, 3) not null default 0 check (min_stock >= 0),
  used_in text not null default '',
  updated_at timestamptz not null default now()
);
create index inventory_items_business_idx on public.inventory_items (business_id);

create table public.inventory_moves (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  at timestamptz not null default now(),
  label text not null,
  delta numeric(12, 3) not null
);
create index inventory_moves_item_idx on public.inventory_moves (item_id, at desc);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  at timestamptz not null default now(),
  concept text not null,
  category text not null check (category in ('insumos', 'nomina', 'arriendo', 'servicios', 'otros')),
  amount bigint not null check (amount > 0),
  method text not null check (method in ('efectivo', 'tarjeta', 'transferencia'))
);
create index expenses_business_at_idx on public.expenses (business_id, at desc);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger staff_updated_at before update on public.staff for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger zones_updated_at before update on public.zones for each row execute function public.set_updated_at();
create trigger dining_tables_updated_at before update on public.dining_tables for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger inventory_items_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seguridad por fila (RLS)
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.staff enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.zones enable row level security;
alter table public.dining_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.cash_closures enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_moves enable row level security;
alter table public.expenses enable row level security;

-- Negocios: los miembros los ven y editan; se crean con create_business(); solo el dueño los borra.
create policy "miembros ven su negocio" on public.businesses
  for select to authenticated using (public.is_business_member(id));
create policy "miembros editan su negocio" on public.businesses
  for update to authenticated using (public.is_business_member(id)) with check (public.is_business_member(id));
create policy "dueño borra su negocio" on public.businesses
  for delete to authenticated using (public.is_business_owner(id));

-- Miembros: cada quien ve sus membresías y el dueño ve y gestiona las de su negocio.
create policy "ver membresías" on public.business_members
  for select to authenticated using (user_id = auth.uid() or public.is_business_owner(business_id));
create policy "dueño agrega miembros" on public.business_members
  for insert to authenticated with check (public.is_business_owner(business_id));
create policy "dueño cambia miembros" on public.business_members
  for update to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy "dueño quita miembros" on public.business_members
  for delete to authenticated using (public.is_business_owner(business_id));

-- Tablas de datos del negocio: acceso completo para los miembros de ese negocio.
create policy "miembros del negocio" on public.staff
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.categories
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.products
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.zones
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.dining_tables
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.orders
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.order_items
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.sales
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.sale_items
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.cash_closures
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.inventory_items
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.inventory_moves
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "miembros del negocio" on public.expenses
  for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- Fotos de productos y logos (Storage, privado)
-- Ruta: <business_id>/<archivo>. Solo los miembros de ese negocio leen y escriben.
-- ---------------------------------------------------------------------------

-- Compara como texto para no fallar con rutas que no empiezan por un UUID.
create or replace function public.is_business_folder(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.user_id = auth.uid() and m.business_id::text = (storage.foldername(object_name))[1]
  );
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "miembros leen fotos de su negocio" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_business_folder(name));
create policy "miembros suben fotos de su negocio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_business_folder(name));
create policy "miembros cambian fotos de su negocio" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_business_folder(name))
  with check (bucket_id = 'product-images' and public.is_business_folder(name));
create policy "miembros borran fotos de su negocio" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_business_folder(name));
