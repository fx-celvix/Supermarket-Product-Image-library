-- ============================================
-- Supermarket Product Library - Supabase Setup
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PROFILES TABLE (Must be first - other policies reference it)
-- ============================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text,
  phone text,
  role text default 'customer',
  is_approved boolean default false,
  access_expiry timestamp with time zone,
  updated_at timestamp with time zone
);

comment on column profiles.access_expiry is 'Date and time when user access will be automatically revoked';

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Profile policies
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );


-- ============================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role, is_approved)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.email,
    case when new.email = 'team.celvix@gmail.com' then 'admin' else 'customer' end,
    case when new.email = 'team.celvix@gmail.com' then true else false end
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================
-- 3. PRODUCTS TABLE
-- ============================================

create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  subcategory text,
  image_url text not null,
  price numeric,
  size text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for products
alter table products enable row level security;

-- Product policies (Admin only for mutations)
drop policy if exists "Public products are viewable by everyone" on products;
create policy "Public products are viewable by everyone"
  on products for select
  using ( true );

drop policy if exists "Authenticated users can insert products" on products;
drop policy if exists "Admins can insert products" on products;
create policy "Admins can insert products"
  on products for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

drop policy if exists "Authenticated users can update products" on products;
drop policy if exists "Admins can update products" on products;
create policy "Admins can update products"
  on products for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

drop policy if exists "Authenticated users can delete products" on products;
drop policy if exists "Admins can delete products" on products;
create policy "Admins can delete products"
  on products for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );


-- ============================================
-- 4. CATEGORIES TABLE
-- ============================================

create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  parent_name text, -- NULL for main categories, or name of parent for subcategories
  image_url text,
  link text, -- Custom slug or external link
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add unique constraint (Postgres 15+)
alter table categories add constraint categories_name_parent_key 
  unique nulls not distinct (name, parent_name);

-- Enable RLS for categories
alter table categories enable row level security;

-- Category policies
drop policy if exists "Public categories are viewable by everyone." on categories;
create policy "Public categories are viewable by everyone."
  on categories for select
  using ( true );

drop policy if exists "Authenticated users can insert categories." on categories;
create policy "Authenticated users can insert categories."
  on categories for insert
  with check ( auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can update categories." on categories;
create policy "Authenticated users can update categories."
  on categories for update
  using ( auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete categories." on categories;
create policy "Authenticated users can delete categories."
  on categories for delete
  using ( auth.role() = 'authenticated' );


-- ============================================
-- 5. STORAGE BUCKET & POLICIES
-- ============================================

-- Create the 'product-images' bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can update images" on storage.objects;
create policy "Authenticated users can update images"
  on storage.objects for update
  using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete images" on storage.objects;
create policy "Authenticated users can delete images"
  on storage.objects for delete
  using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
