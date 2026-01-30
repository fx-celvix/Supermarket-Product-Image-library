-- Add access_expiry column to profiles table
alter table profiles 
add column if not exists access_expiry timestamp with time zone;

-- Comment on column
comment on column profiles.access_expiry is 'Date and time when user access will be automatically revoked';
