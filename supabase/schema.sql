-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
-- Linked to auth.users via ID
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text unique not null,
  unique_code text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CHATS TABLE
-- Stores conversation metadata
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_message text,
  last_message_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CHAT PARTICIPANTS TABLE
-- Junction table for Many-to-Many relationship (Users <-> Chats)
create table public.chat_participants (
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (chat_id, user_id)
);

-- MESSAGES TABLE
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- POLICIES

-- Profiles: Public read, Self update
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Chat Participants: View own participations
create policy "Users can view chats they are part of"
  on chat_participants for select
  using ( auth.uid() = user_id );

-- Chats: View if participant
create policy "Users can view chats they joined"
  on chats for select
  using (
    exists (
      select 1 from chat_participants cp
      where cp.chat_id = id
      and cp.user_id = auth.uid()
    )
  );

-- Messages: View if participant of chat
create policy "Users can view messages in their chats"
  on messages for select
  using (
    exists (
      select 1 from chat_participants cp
      where cp.chat_id = chat_id
      and cp.user_id = auth.uid()
    )
  );

-- Messages: Insert if participant
create policy "Users can insert messages in their chats"
  on messages for insert
  with check (
    exists (
      select 1 from chat_participants cp
      where cp.chat_id = chat_id
      and cp.user_id = auth.uid()
    )
  );

-- FUNCTION: handle_new_user
-- Automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_unique_code text;
begin
  -- Generate simple unique code (e.g., first 4 chars of email + random number)
  -- For robustness, we'll use a random string
  new_unique_code := upper(substring(md5(random()::text) from 1 for 6));
  
  insert into public.profiles (id, email, unique_code, display_name)
  values (new.id, new.email, new_unique_code, split_part(new.email, '@', 1));
  return new;
end;
$$;

-- TRIGGER: on_auth_user_created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
