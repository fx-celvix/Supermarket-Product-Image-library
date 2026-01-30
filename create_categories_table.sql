-- Create categories table for metadata storage
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  parent_name text, -- NULL for main categories, or name of parent for subcategories
  image_url text,
  link text, -- Custom slug or external link
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add unique constraint to prevent duplicates (requires Postgres 15+)
-- If this fails, you can remove 'nulls not distinct' and handle uniqueness in app
alter table categories add constraint categories_name_parent_key unique nulls not distinct (name, parent_name);

-- Enable RLS
alter table categories enable row level security;

-- Policies
create policy "Public categories are viewable by everyone."
  on categories for select
  using ( true );

create policy "Authenticated users can insert categories."
  on categories for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can update categories."
  on categories for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete categories."
  on categories for delete
  using ( auth.role() = 'authenticated' );
