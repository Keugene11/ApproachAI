create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  status text not null,
  price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'subscriptions' and policyname = 'Users can read own subscription'
  ) then
    create policy "Users can read own subscription"
      on public.subscriptions for select
      using (auth.uid() = user_id);
  end if;
end $$;
