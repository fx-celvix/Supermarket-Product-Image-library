-- Fix RLS policies to allow Admins to update user status

-- 1. Drop the restrictive "Users can update own profile" policy if it conflicts or is insufficient
-- Actually, we can keep it and ADD a new policy. Policies are OR'ed together.

create policy "Admins can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );

-- Also, let's secure the Products table while we are at it, so only Admins can manage products.
-- Currently: "Authenticated users can insert products" (Any logged in user)
-- We should probably change this to Admins only.

drop policy if exists "Authenticated users can insert products" on products;
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
create policy "Admins can delete products"
  on products for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role = 'admin'
    )
  );
