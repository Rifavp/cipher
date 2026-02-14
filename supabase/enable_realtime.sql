-- Enable Realtime for relevant tables
begin;

  -- Remove if already exists to avoid errors (optional, but safe)
  -- drop publication if exists supabase_realtime; 
  -- We assume 'supabase_realtime' publication exists by default in Supabase. 
  -- If not, create it: create publication supabase_realtime;

  -- Add tables to the publication
  alter publication supabase_realtime add table messages;
  alter publication supabase_realtime add table chats;
  alter publication supabase_realtime add table chat_participants;

commit;
