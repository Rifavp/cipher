-- 1. ADD CUSTOM CHAT NAME COLUMN
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS custom_chat_name TEXT;

-- 2. CREATE FUNCTION FOR LOGIN LOOKUP
CREATE OR REPLACE FUNCTION get_email_by_unique_code(code_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email TEXT;
BEGIN
  SELECT email INTO found_email
  FROM public.profiles
  WHERE unique_code = code_input;
  
  RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_unique_code(TEXT) TO anon, authenticated, service_role;

-- 3. FIX CHAT PARTICIPANT VISIBILITY (Critical for new chats)
DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view all participants in their chats" ON public.chat_participants;

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

-- 4. FIX UPDATE PERMISSIONS (For renaming chats)
DROP POLICY IF EXISTS "Users can update their own participant details" ON public.chat_participants;

CREATE POLICY "Users can update their own participant details"
  ON chat_participants FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- 5. FIX CHAT CREATION (If not already present)
CREATE POLICY "Users can create chats"
ON public.chats
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can add participants"
ON public.chat_participants
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
