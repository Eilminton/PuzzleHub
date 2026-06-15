create extension if not exists pgcrypto;

create table if not exists public.couple_members (
  couple_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

alter table public.sudoku_sessions
  add column if not exists couple_id text,
  add column if not exists title text,
  add column if not exists difficulty text,
  add column if not exists status text,
  add column if not exists initial_board integer[],
  add column if not exists deleted_at timestamptz,
  add column if not exists last_opened_at timestamptz,
  add column if not exists last_edited_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz;

update public.sudoku_sessions
set
  title = coalesce(title, 'Sudoku'),
  difficulty = coalesce(difficulty, 'easy'),
  initial_board = coalesce(
    initial_board,
    case
      when board is null then array[]::integer[]
      when jsonb_typeof(board) = 'array' then (
        select coalesce(array_agg(value::integer order by ordinality), array[]::integer[])
        from jsonb_array_elements_text(board) with ordinality as cells(value, ordinality)
      )
      else array[]::integer[]
    end
  ),
  updated_at = coalesce(updated_at, now())
where title is null
   or difficulty is null
   or initial_board is null
   or updated_at is null;

update public.sudoku_sessions
set
  status = case
    when session_status = 'active' then 'in_progress'
    when session_status = 'waiting' then 'paused'
    when session_status = 'finished' then 'finished'
    else coalesce(status, 'new')
  end
where status is null;

create index if not exists sudoku_sessions_couple_id_idx on public.sudoku_sessions (couple_id);
create index if not exists sudoku_sessions_updated_at_idx on public.sudoku_sessions (updated_at desc);
create index if not exists sudoku_sessions_deleted_at_idx on public.sudoku_sessions (deleted_at);

alter table public.couple_members enable row level security;
alter table public.sudoku_sessions enable row level security;

drop policy if exists "members can read their couple scope" on public.couple_members;
create policy "members can read their couple scope"
on public.couple_members
for select
using (user_id = auth.uid());

drop policy if exists "couple members can read sudoku sessions" on public.sudoku_sessions;
create policy "couple members can read sudoku sessions"
on public.sudoku_sessions
for select
using (
  exists (
    select 1
    from public.couple_members m
    where m.couple_id = couple_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "couple members can create sudoku sessions" on public.sudoku_sessions;
create policy "couple members can create sudoku sessions"
on public.sudoku_sessions
for insert
with check (
  exists (
    select 1
    from public.couple_members m
    where m.couple_id = couple_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "couple members can update sudoku sessions" on public.sudoku_sessions;
create policy "couple members can update sudoku sessions"
on public.sudoku_sessions
for update
using (
  exists (
    select 1
    from public.couple_members m
    where m.couple_id = couple_id
      and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.couple_members m
    where m.couple_id = couple_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "couple members can delete sudoku sessions" on public.sudoku_sessions;
create policy "couple members can delete sudoku sessions"
on public.sudoku_sessions
for delete
using (
  exists (
    select 1
    from public.couple_members m
    where m.couple_id = couple_id
      and m.user_id = auth.uid()
  )
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_sudoku_sessions_updated_at on public.sudoku_sessions;
create trigger touch_sudoku_sessions_updated_at
before update on public.sudoku_sessions
for each row
execute function public.touch_updated_at();

-- Seed example:
-- insert into public.couple_members (couple_id, user_id) values
--   ('your-couple-id', 'uuid-of-user-1'),
--   ('your-couple-id', 'uuid-of-user-2');
