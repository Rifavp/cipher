-- FIX: Add missing RLS policies to allow chat creation

-- 1. Allow authenticated users to create new chats
CREATE POLICY "Users can create chats"
ON public.chats
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow authenticated users to add participants (including themselves and others)
-- Note: This relies on the security of UUIDs. Only someone with the chat_id can add participants.
CREATE POLICY "Users can add participants"
ON public.chat_participants
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
