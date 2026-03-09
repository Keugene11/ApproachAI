-- Run this in your Supabase SQL editor to create the usage tracking table

create table if not exists public.usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  free_sessions_used integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.usage enable row level security;

-- Users can read their own usage
create policy "Users can read own usage"
  on public.usage for select
  using (auth.uid() = user_id);
