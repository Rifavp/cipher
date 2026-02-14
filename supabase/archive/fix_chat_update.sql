-- FIX: Allow participants to update chat metadata (e.g., last_message)

create policy "Users can update chats they joined"
  on public.chats
  for update
  using (
    exists (
      select 1 from public.chat_participants cp
      where cp.chat_id = id
      and cp.user_id = auth.uid()
    )
  );
