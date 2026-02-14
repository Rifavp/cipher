-- Allow users to update their own participation details (for custom_chat_name)
CREATE POLICY "Users can update their own participant details"
  ON chat_participants FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );
