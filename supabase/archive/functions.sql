
-- Function to get an existing direct chat or create a new one
-- Returns the chat_id
create or replace function public.get_or_create_direct_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer -- Run as owner to bypass RLS for creation
set search_path = public
as $$
declare
  current_user_id uuid;
  existing_chat_id uuid;
  new_chat_id uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if current_user_id = other_user_id then
    raise exception 'Cannot create chat with self';
  end if;

  -- 1. Try to find an existing direct chat (strictly 2 participants)
  -- We look for a chat where both users are participants and total participants = 2
  select c.id into existing_chat_id
  from chats c
  join chat_participants cp1 on c.id = cp1.chat_id
  join chat_participants cp2 on c.id = cp2.chat_id
  where cp1.user_id = current_user_id
  and cp2.user_id = other_user_id
  and (select count(*) from chat_participants cp3 where cp3.chat_id = c.id) = 2
  limit 1;

  if existing_chat_id is not null then
    return existing_chat_id;
  end if;

  -- 2. Create new chat
  insert into chats (last_message_at)
  values (now())
  returning id into new_chat_id;

  -- 3. Add participants
  insert into chat_participants (chat_id, user_id)
  values 
    (new_chat_id, current_user_id),
    (new_chat_id, other_user_id);

  return new_chat_id;
end;
$$;
