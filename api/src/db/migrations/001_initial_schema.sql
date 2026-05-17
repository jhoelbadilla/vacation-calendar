create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_normalized text not null unique,
  email text not null,
  email_normalized text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_username_format check (username ~ '^[A-Za-z0-9_-]+$'),
  constraint users_username_length check (char_length(username) between 3 and 32)
);

create table simulation_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index simulation_profiles_user_created_idx on simulation_profiles(user_id, created_at);

create table simulation_settings (
  profile_id uuid primary key references simulation_profiles(id) on delete cascade,
  current_vacation_hours numeric(8,2) not null default 0,
  current_vacation_as_of_date date not null default current_date,
  standard_workday_hours numeric(5,2) not null default 7.5,
  vacation_hours_per_work_hour numeric(8,4) not null default 0.1,
  weekends_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulation_settings_current_vacation_nonnegative check (current_vacation_hours >= 0),
  constraint simulation_settings_standard_day_range check (standard_workday_hours > 0 and standard_workday_hours <= 24),
  constraint simulation_settings_accrual_nonnegative check (vacation_hours_per_work_hour >= 0)
);

create table day_overrides (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references simulation_profiles(id) on delete cascade,
  calendar_date date not null,
  work_hours numeric(5,2),
  vacation_day boolean not null default false,
  vacation_hours numeric(5,2) not null default 0,
  personal_day boolean not null default false,
  public_holiday boolean not null default false,
  unpaid_day boolean not null default false,
  unpaid_hours numeric(5,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, calendar_date),
  constraint day_overrides_work_hours_range check (work_hours is null or (work_hours >= 0 and work_hours <= 24)),
  constraint day_overrides_vacation_hours_range check (vacation_hours >= 0 and vacation_hours <= 24),
  constraint day_overrides_unpaid_hours_range check (unpaid_hours >= 0 and unpaid_hours <= 24)
);

create index day_overrides_profile_date_idx on day_overrides(profile_id, calendar_date);
