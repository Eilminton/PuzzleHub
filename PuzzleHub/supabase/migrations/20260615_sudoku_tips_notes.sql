alter table public.sudoku_sessions
  add column if not exists candidate_notes jsonb,
  add column if not exists hints_remaining integer;

update public.sudoku_sessions
set
  candidate_notes = coalesce(candidate_notes, '[]'::jsonb),
  hints_remaining = coalesce(hints_remaining, 3)
where candidate_notes is null
   or hints_remaining is null;

alter table public.sudoku_sessions
  alter column candidate_notes set default '[]'::jsonb,
  alter column hints_remaining set default 3;
