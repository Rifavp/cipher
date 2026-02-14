-- 1. FIX "UNKNOWN USER" (Break recursion with Security Definer)

-- Function to check membership without triggering RLS recursively
CREATE OR REPLACE FUNCTION public.is_chat_member(check_chat_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE chat_id = check_chat_id
    AND user_id = auth.uid()
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can view all participants in their chats" ON public.chat_participants;
CREATE POLICY "Users can view all participants in their chats"
  ON public.chat_participants
  FOR SELECT
  USING (
    public.is_chat_member(chat_id)
  );

-- 2. FIX "SAVING NAME" (Add column and allow updates)
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS custom_chat_name TEXT;

DROP POLICY IF EXISTS "Users can update their own participant details" ON public.chat_participants;
CREATE POLICY "Users can update their own participant details"
  ON chat_participants FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- 3. ENABLE LOGIN BY UNIQUE CODE (If not already working)
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
