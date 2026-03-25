-- Fix: Stop leaking real names from Google OAuth into profiles and community
-- The old trigger used full_name from Google metadata as the default username.
-- New trigger uses an anonymous "user_" + last 6 chars of user ID.

-- Update the trigger function to use anonymous usernames
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    'user_' || right(new.id::text, 6)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Anonymize existing profiles that still have a real-name-derived username
-- (any username that doesn't start with "user_" is likely a real name)
update profiles
set username = 'user_' || right(id::text, 6),
    updated_at = now()
where username not like 'user_%';

-- Also anonymize author_name in existing community posts
update posts
set author_name = (
  select username from profiles where profiles.id = posts.user_id
)
where exists (select 1 from profiles where profiles.id = posts.user_id);

-- Also anonymize author_name in existing comments
update comments
set author_name = (
  select username from profiles where profiles.id = comments.user_id
)
where exists (select 1 from profiles where profiles.id = comments.user_id);
