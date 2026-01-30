-- Create the products table
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

-- Enable Row Level Security (RLS) for products
alter table products enable row level security;

-- Create policies for products
drop policy if exists "Public products are viewable by everyone" on products;
create policy "Public products are viewable by everyone"
  on products for select
  using ( true );

drop policy if exists "Authenticated users can insert products" on products;
create policy "Authenticated users can insert products"
  on products for insert
  with check ( auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can update products" on products;
create policy "Authenticated users can update products"
  on products for update
  using ( auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete products" on products;
create policy "Authenticated users can delete products"
  on products for delete
  using ( auth.role() = 'authenticated' );

-- Create a table for public profiles (prevents "Database error" on signup triggers)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text,
  phone text,
  role text default 'customer',
  is_approved boolean default false,
  updated_at timestamp with time zone
);

-- Turn on RLS for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Trigger to create profile on signup
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

-- Re-create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- STORAGE POLICIES
-- Create the bucket 'product-images' automatically
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Allow public read access to product images
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

-- Allow authenticated users to upload images
drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

-- Allow authenticated users to update/delete images
drop policy if exists "Authenticated users can update images" on storage.objects;
create policy "Authenticated users can update images"
  on storage.objects for update
  using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete images" on storage.objects;
create policy "Authenticated users can delete images"
  on storage.objects for delete
  using ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
