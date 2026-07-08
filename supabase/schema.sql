create table if not exists public.products (
  id text primary key,
  item_number text not null default '',
  product_category text not null default '',
  product_name text not null default '',
  model_number text not null default '',
  shelf_number text not null default '',
  keywords jsonb not null default '[]'::jsonb,
  source_name text not null default 'オンライン商品マスタ',
  updated_at timestamptz not null default now()
);

create index if not exists products_item_number_idx on public.products (item_number);
create index if not exists products_shelf_number_idx on public.products (shelf_number);
create index if not exists products_product_name_idx on public.products (product_name);

create table if not exists public.repick_requests (
  id text primary key,
  item_number text not null default '',
  product_category text not null default '',
  product_name text not null default '',
  model_number text not null default '',
  shelf_number text not null default '',
  packaging_category text not null default '一般',
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repick_requests_status_idx on public.repick_requests (status);
create index if not exists repick_requests_updated_at_idx on public.repick_requests (updated_at desc);
create index if not exists repick_requests_pending_merge_idx
  on public.repick_requests (status, item_number, shelf_number, packaging_category);
