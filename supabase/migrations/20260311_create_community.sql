-- Posts
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Anonymous',
  title text not null,
  body text not null,
  score integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Anyone can read posts"
  on public.posts for select
  using (auth.role() = 'authenticated');

create policy "Users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- Votes
create table if not exists public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  direction smallint not null check (direction in (1, -1)),
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.votes enable row level security;

create policy "Anyone can read votes"
  on public.votes for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own votes"
  on public.votes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own votes"
  on public.votes for update
  using (auth.uid() = user_id);

create policy "Users can delete own votes"
  on public.votes for delete
  using (auth.uid() = user_id);

-- Comments
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Anonymous',
  body text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Anyone can read comments"
  on public.comments for select
  using (auth.role() = 'authenticated');

create policy "Users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_posts_created_at on public.posts(created_at desc);
create index idx_posts_score on public.posts(score desc);
create index idx_comments_post_id on public.comments(post_id, created_at asc);
create index idx_votes_post_user on public.votes(post_id, user_id);

-- Auto-update post score when votes change
create or replace function public.update_post_score()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.posts set score = (
      select coalesce(sum(direction), 0) from public.votes where post_id = OLD.post_id
    ) where id = OLD.post_id;
    return OLD;
  else
    update public.posts set score = (
      select coalesce(sum(direction), 0) from public.votes where post_id = NEW.post_id
    ) where id = NEW.post_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_vote_change
  after insert or update or delete on public.votes
  for each row execute function public.update_post_score();

-- Auto-update comment count
create or replace function public.update_comment_count()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update public.posts set comment_count = (
      select count(*) from public.comments where post_id = OLD.post_id
    ) where id = OLD.post_id;
    return OLD;
  else
    update public.posts set comment_count = (
      select count(*) from public.comments where post_id = NEW.post_id
    ) where id = NEW.post_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.update_comment_count();
