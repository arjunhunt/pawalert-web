-- ==============================================================================
-- PawAlert Supabase Database Schema
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create dog reports table
create table if not exists public.reports (
    id uuid primary key default uuid_generate_v4(),
    reporter_id text default 'anonymous',
    reporter_name text not null default 'Anonymous Feeder',
    problem_type text not null check (problem_type in ('HUNGRY', 'INJURED', 'SICK', 'STUCK', 'AGGRESSIVE', 'LOST', 'NEWBORN_LITTER', 'OTHER')),
    description text not null,
    photo_url text not null default '',
    latitude double precision not null,
    longitude double precision not null,
    address text not null default '',
    landmark text not null default '',
    status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    helper_id text,
    helper_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create index for fast geo and status querying
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_created_at on public.reports (created_at desc);
create index if not exists idx_reports_coords on public.reports (latitude, longitude);

-- 4. Enable Row Level Security (RLS)
alter table public.reports enable row level security;

-- Allow public read access to all reports
create policy "Allow public read access on reports"
on public.reports for select
using (true);

-- Allow anyone to create reports
create policy "Allow public insert on reports"
on public.reports for insert
with check (true);

-- Allow anyone to claim/resolve reports
create policy "Allow public update on reports"
on public.reports for update
using (true);

-- 5. Enable Realtime updates
alter publication supabase_realtime add table public.reports;

-- 6. Setup Supabase Storage bucket for dog photos
insert into storage.buckets (id, name, public)
values ('dog-photos', 'dog-photos', true)
on conflict (id) do nothing;

-- Storage RLS: Allow anyone to view photos
create policy "Public Dog Photos Access"
on storage.objects for select
using (bucket_id = 'dog-photos');

-- Storage RLS: Allow anyone to upload photos
create policy "Public Dog Photos Upload"
on storage.objects for insert
with check (bucket_id = 'dog-photos');
