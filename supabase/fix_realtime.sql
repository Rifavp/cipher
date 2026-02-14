-- Enable Realtime for messages table
-- This is critical for the chat to update instantly
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- Policies for Messages
-- Ensure users can read messages from chats they are part of
-- This is often missed, preventing the subscription from receiving 'INSERT' events
create policy "Users can read messages in their chats"
on public.messages
for select
using (
  auth.uid() in (
    select user_id from chat_participants where chat_id = messages.chat_id
  )
);

-- Ensure users can insert messages into chats they are part of
create policy "Users can insert messages in their chats"
on public.messages
for insert
with check (
  auth.uid() in (
    select user_id from chat_participants where chat_id = messages.chat_id
  )
);
