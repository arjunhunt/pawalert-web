-- ==============================================================================
-- PawAlert Complete Supabase Database Schema
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create dog reports table with security constraints
create table if not exists public.reports (
    id uuid primary key default uuid_generate_v4(),
    reporter_id text default 'anonymous',
    reporter_name text not null default 'Anonymous Feeder' check (length(reporter_name) <= 100),
    problem_type text not null check (problem_type in ('HUNGRY', 'INJURED', 'SICK', 'STUCK', 'AGGRESSIVE', 'LOST', 'NEWBORN_LITTER', 'OTHER')),
    description text not null check (length(description) >= 1 and length(description) <= 2000),
    photo_url text not null default '',
    latitude double precision not null check (latitude >= -90.0 and latitude <= 90.0),
    longitude double precision not null check (longitude >= -180.0 and longitude <= 180.0),
    address text not null default '' check (length(address) <= 500),
    landmark text not null default '' check (length(landmark) <= 300),
    status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    helper_id text,
    helper_name text check (helper_name is null or length(helper_name) <= 100),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create high-performance compound indexes
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_created_at on public.reports (created_at desc);
create index if not exists idx_reports_coords on public.reports (latitude, longitude);
create index if not exists idx_reports_active_feed on public.reports (status, created_at desc);
create index if not exists idx_reports_geo_status on public.reports (latitude, longitude, status);

-- 4. Enable Row Level Security (RLS)
alter table public.reports enable row level security;

create policy "Allow public read access on reports" on public.reports for select using (true);
create policy "Allow public insert on reports" on public.reports for insert with check (true);
create policy "Allow public update on reports" on public.reports for update using (true);
create policy "Allow public delete on reports" on public.reports for delete using (true);

-- 5. Enable Realtime updates
alter publication supabase_realtime add table public.reports;

-- 6. Setup Supabase Storage bucket for dog photos (Max 5MB, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'dog-photos',
    'dog-photos',
    true,
    5242880, -- 5 MB limit
    array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage RLS
create policy "Public Dog Photos Access" on storage.objects for select using (bucket_id = 'dog-photos');
create policy "Public Dog Photos Upload" on storage.objects for insert with check (bucket_id = 'dog-photos');

-- ==============================================================================
-- 7. Live Comments & Rescue Coordination Table
-- ==============================================================================
create table if not exists public.comments (
    id uuid primary key default uuid_generate_v4(),
    report_id uuid references public.reports(id) on delete cascade not null,
    author_id text not null default 'anonymous',
    author_name text not null default 'Community Feeder' check (length(author_name) <= 100),
    content text not null check (length(content) >= 1 and length(content) <= 1000),
    comment_type text not null default 'GENERAL' check (comment_type in ('UPDATE', 'ON_MY_WAY', 'FEEDING', 'VET_CONTACTED', 'GENERAL')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_comments_report_id on public.comments (report_id);
create index if not exists idx_comments_created_at on public.comments (created_at asc);

alter table public.comments enable row level security;

create policy "Allow public read access on comments" on public.comments for select using (true);
create policy "Allow public insert on comments" on public.comments for insert with check (true);
create policy "Allow public delete on comments" on public.comments for delete using (true);

alter publication supabase_realtime add table public.comments;

-- ==============================================================================
-- 8. Cloud Volunteer User Profiles & Cross-Device Karma Sync Table
-- ==============================================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    display_name text not null default 'Community Feeder',
    dogs_fed integer not null default 0 check (dogs_fed >= 0),
    rescues integer not null default 0 check (rescues >= 0),
    reports_made integer not null default 0 check (reports_made >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Allow public read profiles" on public.profiles for select using (true);
create policy "Allow user insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Allow user update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger to automatically create a profile whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, dogs_fed, rescues, reports_made)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    0,
    0,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
