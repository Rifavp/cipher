-- Allow users to see all participants in chats they are part of
-- This is necessary so the UI can display the "other" user
DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chat_participants;

CREATE POLICY "Users can view all participants in their chats"
  ON public.chat_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_id
      AND cp.user_id = auth.uid()
    )
  );
